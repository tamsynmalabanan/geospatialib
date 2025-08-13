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
from operator import or_, add
from urllib.parse import urlparse

from helpers.main.collection import get_collection_data, sort_layers, update_collection_data
from main.models import SpatialRefSys, URL, Layer
from main.forms import ValidateCollectionForm
from main.tasks import onboard_collection
from main import forms
from helpers.base.utils import create_cache_key, find_nearest_divisible
from helpers.main.constants import QUERY_BLACKLIST
from .agent import create_thematic_map

import logging
logger = logging.getLogger('django')

class LayerList(ListView):
    template_name = 'main/search/results.html'
    model = Layer
    context_object_name = 'layers'
    paginate_by = 30

    @property
    def filter_fields(self):
        return [
            'type',
        ]

    @property
    def clean_keywords(self):
        query = self.request.GET.get('query', '').strip().lower()
        for i in ['\'', '"']:
            query = query.replace(i, '')
        exclusions = []

        if ' -' in f' {query}':
            exclusions = sorted(set([i[1:] for i in query.split() if i.startswith('-') and len(i) > 3]))
            query = ' '.join([i for i in query.split() if not i.startswith('-') and i not in exclusions])

        for i in ['/', '\\', '_']:
            query = query.replace(i, ' ')
        query = sorted(set([i for i in query.split() if len(i) >= 3 and i not in QUERY_BLACKLIST]))
        
        return query, exclusions

    @property
    def raw_query(self):
        query, exclusions = self.clean_keywords
        return f'({' | '.join([f"'{i}'" for i in query])}){f' & !({' | '.join([f"'{i}'" for i in exclusions])})' if exclusions else ''}'
    
    @property
    def filter_values(self):
        values = sorted([str(v).strip() for k, v in self.request.GET.items() if k not in ['query', 'page'] and v != ''])
        return values

    @property
    def cache_key(self):
        return create_cache_key(['layer_list']+[self.raw_query]+self.filter_values)

    @property
    def filtered_queryset(self):
        query = self.clean_keywords[0]
        if not query:
            return

        queryset = (
            super().get_queryset()
            .select_related(
                'collection__url',
            )
        )

        if self.filter_values:
            queryset = queryset.filter(**{
                param : value 
                for param, value in self.request.GET.items()
                if value and param in self.filter_fields + [
                    'bbox__bboverlaps'
                ]
            })
        
        queryset = (
            queryset
            .filter(
                search_vector=SearchQuery(self.raw_query, search_type='raw'),
            )
            .annotate(
                rank=SearchRank(F('search_vector'), SearchQuery(' OR '.join(query), search_type='websearch'))
            )
        )

        return queryset

    @property
    def query_filters(self):
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
            if value and len(filters.get(field, [])) == 0:
                filters[field] = [{field: value, 'count': 0}]

        return filters

    def get_queryset(self):
        if not hasattr(self, 'queryset') or getattr(self, 'queryset') is None:
            queryset = cache.get(self.cache_key)

            if not queryset:
                queryset = self.filtered_queryset
                if queryset.exists():
                    cache.set(self.cache_key, queryset, timeout=60*15)

            self.queryset = queryset

        queryset = self.queryset

        if queryset and queryset.exists():
            queryset = (
                self.queryset
                .annotate(rank=Max('rank'))
                .order_by(*['-rank', 'title', 'type'])
            )

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['raw_query'] = self.raw_query
        if context['page_obj'].number == 1:
            context['filters'] = self.query_filters
            context['is_filtered'] = len(self.filter_values) > 0
        return context

@require_http_methods(['POST'])
def find_layers(request):
    response = 'Sorry, this feature is currently not available.'
    
    # try:
    #     data = request.POST.dict()
    #     subject = data.get('subject')
    
    #     if subject:
    #         tries = 0
    #         while not response and tries < 3:
    #             response = create_thematic_map(subject, data.get('bbox'))
    #             tries +=1
    # except Exception as e:
    #     response = e
    
    return render(request, 'helpers/partials/find_layers/response.html', {'response':response})

@require_http_methods(['GET'])
def validate_collection(request):
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

@require_http_methods(['POST'])
def update_collection(request):
    cache_key = request.POST.get('cache_key')
    updated_layers = json.loads(request.POST.get('layers'))
    update_collection_data(cache_key, updated_layers)
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