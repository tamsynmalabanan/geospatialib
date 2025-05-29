from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse, get_object_or_404
from django.http import JsonResponse
from django.contrib import messages
from django.core.cache import cache

import json
import requests

from helpers.main.collection import get_collection_data, sort_layers
from main.models import SpatialRefSys, URL
from main.forms import ValidateCollectionForm
from main.tasks import onboard_collection

@require_http_methods(['POST'])
def validate_collection(request):
    try:
        data = request.POST.dict()
        context = {'layers':{}}
        form = ValidateCollectionForm(data)
        if form.is_valid():
            context = get_collection_data(
                url = form.cleaned_data.get('url', ''),
                format = form.cleaned_data.get('format', None),
            )
            layers = context.get('layers', {})
            if layers == {}:
                raw_format = data.get('format')
                form.data.update({'format':raw_format})
                if raw_format:
                    form.add_error('format', 'No layers retrieved.')
            else:
                context['layers'] = sort_layers(layers)
        context['form'] = form
        return render(request, 'helpers/partials/add_layers/url_fields.html', context)
    except Exception as e:
        return HttpResponse(e)

@require_http_methods(['POST'])
def update_collection(request):
    map_id = request.POST.get('mapId','')
    updated_layers = json.loads(request.POST.get('layers'))

    cacheKey = request.POST.get('cacheKey')
    collection_data = cache.get(cacheKey)
    temp = None
    if collection_data:
        cached_layers = collection_data.get('layers', {})
        temp = cached_layers
        for name, params in updated_layers.items():
            params['title'] = cached_layers.get(name, {}).get('title', params.get('title', ''))
            cached_layers[name] = params
        collection_data['layers'] = cached_layers
    else:
        fn, url, format = cacheKey.split(';')
        collection_data = {
            'url': url,
            'format': format,
            'layers': updated_layers,
        }

    cache.set(cacheKey, collection_data)
    onboard_collection(cacheKey)

    messages.info(request, json.dumps([
        temp,
        collection_data['layers'],
    ]), extra_tags=map_id)
    return render(request, 'helpers/partials/messages/container.html', {
        'message_tag': map_id,
        'fadeout': 1,
        'dismissible': 1,
    })

@require_http_methods(['GET'])
def get_layer_forms(request):
    layer_names = request.GET.get('layerNames','').split('|')
    layers = {}
    for name in layer_names:
        title, type = name.split('/')[-1].rsplit('.', 1)
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