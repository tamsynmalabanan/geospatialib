from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse, get_object_or_404
from django.conf import settings
from django.http import JsonResponse, Http404, FileResponse, HttpResponse

import os, requests, json

from . import forms
from . import models
from helpers.base.utils import generate_uuid, get_response

def index(request):
    return render(request, 'main/index.html')

def redirect_to_index(request, exception=None):
    return redirect('/')

def serve_sql_wasm(request):
    wasm_path = os.path.join(settings.BASE_DIR, 'helpers/data', 'sql-wasm.wasm')
    if not os.path.exists(wasm_path):
        raise Http404("WASM file not found")

    response = FileResponse(open(wasm_path, 'rb'), content_type='application/wasm')
    response['Content-Disposition'] = 'inline; filename="sql-wasm.wasm"'
    return response

def raster_data_cors_proxy(request):
    url = request.GET.get('url')
    if not url:
        return JsonResponse({'error': 'URL parameter is required'}, status=400)
    
    try:
        response = get_response(url, raise_for_status=False)
        content_type = response.headers.get('Content-Type')
        return HttpResponse(response.content, content_type=content_type, status=response.status_code)
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        return JsonResponse({'error': f'Error during request: {str(e)}'}, status=500)