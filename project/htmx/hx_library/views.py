from django.db.models.query import QuerySet
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.contrib import messages
from django.views.generic.list import ListView
from django.db.models import Count, Sum, F, IntegerField, Value, Q, Case, When, Max, TextField, CharField, FloatField
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline
from django.utils.text import slugify
from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.http import JsonResponse
from django.urls import reverse_lazy

import time
import validators

from apps.library import (
    forms as lib_forms, 
    choices as lib_choices, 
    models as lib_models
)
from apps.main import (
    forms as main_forms, 
    models as main_models
)
from utils.general import form_helpers, util_helpers, model_helpers
from utils.gis import dataset_helpers
import json
import requests

# https://medium.com/@mikyrola8/understanding-lazy-fetching-in-django-a-deep-dive-8159c4822cd4
class SearchList(ListView):
    template_name = 'library/search/results.html'
    model = lib_models.Dataset
    context_object_name = 'datasets'
    paginate_by = 24

    @property
    def page(self):
        return int(self.request.GET.get('page', 1))

    @property
    def query(self):
        query = self.request.GET.get('query')
        
        if validators.url(query) == True and query.endswith('?'):
            query = query[:-1]

        return query

    @property
    def filter_fields(self):
        return [
            'format',
            # 'tags__tag',
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
        return util_helpers.build_cache_key(
            'search-queryset',
            self.query
        )

    def apply_query_filters(self, queryset):
        return queryset.filter(**{
            param:value 
            for param,value in self.request.GET.items() 
            if param in self.filters
            and value not in ['', None]
        })

    def perform_full_text_search(self):
        query = self.query

        queryset = super().get_queryset()
        
        if validators.url(query) == True:
            search_type="plain"
        else:
            search_type="websearch"

        search_query = SearchQuery(query, search_type=search_type)

        search_vector = SearchVector('name')
        
        search_fields = self.filter_fields + [
            'url__url',
            'title',
            'abstract',
            'tags__tag',
        ]
        
        for field in search_fields:
            search_vector = search_vector + SearchVector(field)

        queryset = (
            queryset
            .select_related(
                'url', 
                'default_legend', 
            )
            .prefetch_related(
                'tags',
            )
            .annotate(
                rank=SearchRank(search_vector, search_query),
            )
            .filter(rank__gte=0.001)
        )

        cache.set(self.cache_key, queryset, timeout=3600)
        return queryset

    def get_queryset(self):
        if not hasattr(self, 'queryset') or getattr(self, 'queryset') is None:
            queryset = cache.get(self.cache_key)

            if not queryset:
                queryset = self.perform_full_text_search()

            if queryset.exists():
                queryset = self.apply_query_filters(queryset)
                
            self.queryset = queryset

        queryset = self.queryset
        if queryset and queryset.exists():
            queryset = (
                self.queryset
                .annotate(rank=Max('rank'))
                .order_by(*['-rank']+['title','format'])
            )

        return queryset

    def get_filters(self):
        return {
            field: (
                self.queryset
                .values(field)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count')
            )
            for field in self.filter_fields #+ ['tags__tag']
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.page == 1:
            count = context['page_obj'].paginator.count
            fillers = util_helpers.find_nearest_divisible(count, [2,3])-count

            context['count'] = count
            context['fillers'] = range(fillers)
            context['filters'] = self.get_filters()
        return context


@require_http_methods(['POST'])
def add_dataset(request):
    user = request.user
    dataset_instance = None
    
    form = lib_forms.AddDatasetForm(data={})
    
    data = request.POST.dict()
    url_value = data.get('url', '')
    if url_value.strip() != '':
        url_field = form['url']
        form.data.update({'url':url_value})
        clean_url = form_helpers.validate_field(url_field)
        if clean_url:
            format_field = form['format']
            format_field.field.widget.attrs['disabled'] = False

            format_value = data.get('format', '')
            if format_value == '':
                format_value = dataset_helpers.get_dataset_format(url_value)
            if format_value:
                form.data.update({'format': format_value})
                form.full_clean()
            
            clean_format = form_helpers.validate_field(format_field)
            if clean_format:
                name_field = form['name']
                name_field.field.widget.attrs['disabled'] = False
                name_field.field.widget.attrs['autofocus'] = True

                layers = [layer[0] for layer in name_field.field.choices]
                name_value = data.get('name', '')
                if name_value == '' or name_value not in layers:
                    name_value = util_helpers.get_first_substring_match(url_value, layers)
                if not name_value:
                    name_value = layers[0]
                form.data.update({'name': name_value})
                form.full_clean()

        message_template = 'library/add_dataset/message.html'
        message_tags = 'add-dataset-form message-template'

        dataset_handler = cache.get(form.cached_handler_key)
        url_instance = None

        form_is_valid = form.is_valid()
        clean_data = form.cleaned_data
        
        if form_is_valid and dataset_handler:
            url_instance, created = lib_models.URL.objects.get_or_create(
                url=dataset_handler.access_url,
            )
            if url_instance:
                dataset_queryset = lib_models.Dataset.objects.filter(
                    url=url_instance,
                    format=clean_data['format'],
                    name=clean_data['name'],
                )
                if dataset_queryset.exists():
                    dataset_instance = dataset_queryset.first()
                    messages.info(request, message_template, message_tags)

        if data.get('submit') is not None and not dataset_instance:
            if form_is_valid and url_instance:
                dataset_instance, created = lib_models.Dataset.objects.get_or_create(
                    url=url_instance,
                    format=clean_data['format'],
                    name=clean_data['name'],
                )
                if dataset_instance:
                    if created:
                        dataset_handler.populate_dataset(dataset_instance)
                        messages.success(request, message_template, message_tags)
                    else:
                        messages.info(request, message_template, message_tags)
            else:
                messages.error(request, message_template, message_tags)

    return render(request, 'library/add_dataset/form.html', {
        'form':form, 
        'dataset':dataset_instance,
    })

@require_http_methods(['POST'])
def cors_proxy(request):
    url = request.GET.get('url')

    try:
        data = json.loads(request.body.decode('utf-8'))
        method = str(data.get('method', 'get'))
        
        if method.lower() == 'get':
           response = requests.get(url)
        elif method == 'post':
            response = requests.post(url, json=data)
        else:
            return JsonResponse({'error': f'Unsupported method: {method}'}, status=400)
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        return JsonResponse({'error': f'Error during request: {str(e)}'}, status=500)

    return JsonResponse(response.json())