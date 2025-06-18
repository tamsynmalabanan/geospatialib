from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms
from helpers.main.library import get_layers

def index(request):
    # messages.success(request, 'test', 'main-index-map')

    data = request.GET.dict()

    if data.get('query', '') != '':
        results = get_layers(data)
    else:
        results = 'featured content'

    return render(request, 'main/index.html', { 
        'form': forms.SearchForm(data),
        'results': results
    })