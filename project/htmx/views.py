from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse, get_object_or_404
from django.http import JsonResponse
from django.contrib import messages
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.views.generic import ListView
from django.db.models import QuerySet, Count, Sum, F, IntegerField, Value, Q, Case, When, Max, TextField, CharField, FloatField
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline


import json
import requests
import validators
import os
from functools import reduce
from operator import or_

from helpers.main.collection import get_collection_data, sort_layers, update_collection_data
from main.models import SpatialRefSys, URL, Layer
from main.forms import ValidateCollectionForm
from main.tasks import onboard_collection
from main import forms
from helpers.base.utils import create_cache_key, find_nearest_divisible


class SearchList(ListView):
    template_name = 'main/search/results.html'
    model = Layer
    context_object_name = 'layers'
    paginate_by = 24

    @property
    def query(self):
        query = self.request.GET.get('query', '').strip()

        exclusions = None

        if validators.url(query) == True:
            query = query.split('?')[0]
        else:
            if ' -' in f' {query}':
                keywords = query.split(' ')
                exclusions = [i[1:] for i in keywords if i.startswith('-') and len(i) > 1]
                query = ' '.join([i for i in keywords if not i.startswith('-') and i != ''])

            query = query.replace(' ', ' OR ')

        return (query, exclusions)

    @property
    def filter_fields(self):
        return [
            'type',
        ]

    @property
    def filter_expressions(self):
        return [
            'bbox__bboverlaps'
        ]

    @property
    def filters(self):
        return self.filter_fields + self.filter_expressions

    @property
    def cache_key(self):
        return create_cache_key([
            'SearchList',
            self.request.GET.get('query', '').strip()
        ])

    def apply_query_filters(self, queryset):
        return queryset.filter(**{
            param : value 
            for param, value in self.request.GET.items() 
            if value and param in self.filters
        })

    def perform_full_text_search(self):
        query, exclusions = self.query

        queryset = (
            super().get_queryset()
            .select_related(
                'collection__url', 
            )
        )

        if exclusions:
            # ex_queries = Q(name__icontains=exclusions[0]) | Q(title__icontains=exclusions[0])
            # if len(exclusions) > 1:
            #     for word in exclusions[1:]:
            #         ex_queries |= Q(name__icontains=word) | Q(title__icontains=word)

            ex_queries = reduce(or_, (Q(name__icontains=word) | Q(title__icontains=word) for word in exclusions), Q())

            queryset = queryset.exclude(ex_queries)

        search_query = SearchQuery(query, search_type='plain' if validators.url(query) == True else 'websearch')
        search_vector = SearchVector('name')
        search_fields = self.filter_fields + [
            'collection__url__path',
            'title',
            'abstract',
            'keywords',
            'attribution',
            'styles',
        ]
        for field in search_fields:
            search_vector = search_vector + SearchVector(field)

        queryset = (
            queryset
            .annotate(
                rank=SearchRank(search_vector, search_query),
            )
            .filter(rank__gte=0.001)
        )
        
        return queryset

    def get_filters(self):
        filters = {
            field: list(
                self.queryset
                .values(field)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count')
            ) for field in self.filter_fields
        }

        for field in self.filter_fields:
            value = self.request.GET.get(field)
            if not value or len(filters.get(field, [])) != 0:
                continue
            filters[field] = [{field: value, 'count': 0}]

        return filters

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if context['page_obj'].number == 1:
            context['count'] = count = context['page_obj'].paginator.count
            context['fillers'] = range(find_nearest_divisible(count, [2,3])-count)
            context['filters'] = self.get_filters()
            context['params'] = [i for i in list(self.request.GET.values()) if i and i != '']
        return context

    def get_queryset(self):
        if not hasattr(self, 'queryset') or getattr(self, 'queryset') is None:
            queryset = cache.get(self.cache_key)

            if not queryset or not queryset.exists():
                queryset = self.perform_full_text_search()

            if queryset.exists():
                cache.set(self.cache_key, queryset, timeout=60*15)
                queryset = self.apply_query_filters(queryset)
                
            self.queryset = queryset

        queryset = self.queryset
        if queryset and queryset.exists():
            queryset = (
                self.queryset
                .annotate(rank=Max('rank'))
                .order_by(*['-rank', 'title','type'])
            )

        return queryset

@require_http_methods(['GET'])
def validate_collection(request):
    try:
        data = request.GET.dict()
        context = {'layers':{}}
        form = ValidateCollectionForm(data)
        if form.is_valid():
            context = get_collection_data(
                url = form.cleaned_data.get('url', ''),
                format = form.cleaned_data.get('format', None),
            ) or {}
            layers = context.get('layers', {})
            if layers == {}:
                raw_format = data.get('format')
                form.data.update({'format':raw_format})
                if raw_format:
                    form.add_error('format', 'No layers retrieved.')
            else:
                form.data.update({'url':context['url']})
                context['layers'] = sort_layers(layers)
        context['form'] = form
        return render(request, 'helpers/partials/add_layers/url_fields.html', context)
    except Exception as e:
        return HttpResponse(e)

@require_http_methods(['POST'])
def update_collection(request):
    cacheKey = request.POST.get('cacheKey')
    updated_layers = json.loads(request.POST.get('layers'))
    update_collection_data(cacheKey, updated_layers)
    return HttpResponse('Done.')

@require_http_methods(['GET'])
def get_layer_forms(request):
    layer_names = json.loads(request.GET.get('layerNames','[]'))
    layers = {}
    for name in layer_names:    
        title, type = os.path.normpath(name).split(os.sep)[-1].rsplit('.', 1)
        layers[name] = {
            'title': title, 
            'type': type, 
        }
    layers = sort_layers(layers)
    return render(request, 'helpers/partials/add_layers/layer_forms.html', {
        'layers': layers,
    })
    
@require_http_methods(['POST', 'GET'])
def cors_proxy(request):
    url = request.GET.get('url')
    if not url:
        return JsonResponse({'error': 'URL parameter is required'}, status=400)
    
    try:
        data = {}
        if request.method == 'POST':
            data = json.loads(request.body.decode('utf-8'))
        method = str(data.get('method', 'get')).lower()
        headers = data.get('headers', {})
        
        if method == 'get':
           response = requests.get(url, headers=headers)
        elif method == 'post':
            response = requests.post(url, json=data, headers=headers)
        else:
            return JsonResponse({'error': f'Unsupported method: {method}'}, status=400)
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        return JsonResponse({'error': f'Error during request: {str(e)}'}, status=500)

    content_type = response.headers.get('Content-Type')
    return HttpResponse(response.content, content_type=content_type, status=response.status_code)

def srs_wkt(request, srid):
    srs = get_object_or_404(SpatialRefSys, srid=srid)
    return HttpResponse(srs.srtext, content_type='text/plain')