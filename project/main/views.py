from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse, get_object_or_404
from django.conf import settings
from django.http import JsonResponse, Http404, FileResponse

import os

from . import forms
from . import models

def index(request):
    data = request.GET.dict()
    context = {'form': forms.SearchForm(data)}
    if data.get('query', '') == '':
        context['featured'] = 'featured content'
    return render(request, 'main/index.html', context)

def redirect_to_index(request, exception=None):
    return redirect('/')

def serve_sql_wasm(request):
    wasm_path = os.path.join(settings.BASE_DIR, 'helpers/data', 'sql-wasm.wasm')
    if not os.path.exists(wasm_path):
        raise Http404("WASM file not found")

    response = FileResponse(open(wasm_path, 'rb'), content_type='application/wasm')
    response['Content-Disposition'] = 'inline; filename="sql-wasm.wasm"'
    return response