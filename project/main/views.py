from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms

def index(request):
    # messages.success(request, 'test', 'main-index-map')
    return render(request, 'main/index.html', {
        'search_form': forms.SearchForm()
    })