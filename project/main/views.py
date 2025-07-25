from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms

def index(request):
    data = request.GET.dict()
    context = {'form': forms.SearchForm(data)}
    if data.get('query', '') == '':
        context['featured'] = 'featured content'
    return render(request, 'main/index.html', context)

