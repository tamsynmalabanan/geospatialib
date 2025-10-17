from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse, get_object_or_404

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