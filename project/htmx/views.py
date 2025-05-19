from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse, get_object_or_404
from django.http import JsonResponse

import json
import requests

from helpers.gis.layers import get_collection
from main.models import SpatialRefSys, URL
from main.forms import ValidateCollectionForm

@require_http_methods(['POST'])
def validate_collection(request):
    form = ValidateCollectionForm(request.POST)
    return render(request, 'helpers/partials/add_layers/url_fields.html', {
        'form': form,
    })

    # data = json.loads(request.body.decode('utf-8'))
    # return JsonResponse(get_collection(
    #     data.get('url'),
    #     data.get('format'),
    # ))
        # 'layers': 'sdvdfshdh'

@require_http_methods(['GET'])
def get_file_forms(request):
    filenames = request.GET.get('filenames','').split('|')
    return render(request, 'helpers/partials/add_layers/file_forms.html', {
        'filenames': filenames
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