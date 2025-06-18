from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms

def index(request):
    return render(request, 'main/index.html', { 
        'form': forms.SearchForm(request.GET.dict()),
    })