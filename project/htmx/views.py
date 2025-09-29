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
from functools import cached_property
from django.conf import settings


import json
import requests
import validators
import os
from functools import reduce
from operator import or_, add
from urllib.parse import urlparse
import threading

from helpers.main.collection import get_collection_data, sort_layers, update_collection_data
from main.models import SpatialRefSys, URL, Layer
from main.forms import ValidateCollectionForm
from main.tasks import onboard_collection
from main import forms
from helpers.base.utils import generate_uuid
from helpers.main.constants import QUERY_BLACKLIST
from helpers.main.layers import FilteredLayers
from main.agent import create_thematic_map

import logging
logger = logging.getLogger('django')

class LayerList(ListView):
    template_name = 'main/search/results.html'
    model = Layer
    context_object_name = 'layers'
    paginate_by = 30

    def get_query_filters(self):
        filters = {}

        pk_list = self.filtered_layers.get_cached_pks()
        if pk_list:
            queryset = Layer.objects.filter(pk__in=pk_list)
            
            filters = {
                field: list(
                    queryset
                    .values(field)
                    .annotate(count=Count('id', distinct=True))
                    .order_by('-count')
                ) for field in self.filtered_layers.filter_fields
            }

        for field in self.filtered_layers.filter_fields:
            value = self.filtered_layers.clean_filters.get(field)
            if value not in ['', None] and len(filters.get(field, [])) == 0:
                filters[field] = [{field: value, 'count': 0}]

        return filters

    def get_queryset(self):
        if not hasattr(self, 'filtered_layers') or not self.filtered_layers:
            self.filtered_layers = FilteredLayers(self.request.GET.dict())
        return self.filtered_layers.get_queryset()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if context['page_obj'].number == 1:
            context['filters'] = self.get_query_filters()
            context['is_filtered'] = len(self.filtered_layers.filter_values) > 0
        return context

@require_http_methods(['POST'])
def find_layers(request):
    map_id = generate_uuid()
    subject = request.POST.get('subject')
    bbox = request.POST.get('bbox')
    
    # if settings.DEBUG:
    #     threading.Thread(target=create_thematic_map, args=(subject, bbox, map_id)).start()
    # else:
    #     create_thematic_map.delay(subject, bbox, map_id)

    return render(request, 'helpers/partials/find_layers/placeholder.html', {'map_id': map_id})

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
        filename = os.path.normpath(name).split(os.sep)[-1]
        title, type = filename.rsplit('.', 1) if '.' in filename else [filename, 'unknown']
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