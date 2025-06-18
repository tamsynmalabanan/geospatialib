from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms

def index(request):
    # messages.success(request, 'test', 'main-index-map')

    context = {}

    data = request.GET.dict()

    form = forms.SearchForm(data)

    if data.get('query', '') != '':
        context['results'] = 'search results'
    else:
        context['results'] = 'featured content'

    context['form'] = form

    return render(request, 'main/index.html', context)