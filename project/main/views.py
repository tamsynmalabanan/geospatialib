from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse, get_object_or_404

from . import forms
from . import models
from helpers.main.utils import get_fallback_thumbnail

def index(request):
    data = request.GET.dict()
    context = {'form': forms.SearchForm(data)}
    if data.get('query', '') == '':
        context['featured'] = 'featured content'
    return render(request, 'main/index.html', context)

def redirect_to_index(request, exception=None):
    return redirect('/')

def layer_thumbnail(request, pk):
    layer_instance = get_object_or_404(models.Layer, pk=pk)
    thumbnail = layer_instance.generate_thumbnail()
    return HttpResponse(thumbnail.read(), content_type='image/png')