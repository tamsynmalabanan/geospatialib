from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

from . import forms
from . import models
from helpers.main.utils import create_extent_map, create_xyz_map

def index(request):
    data = request.GET.dict()
    context = {'form': forms.SearchForm(data)}
    if data.get('query', '') == '':
        context['featured'] = 'featured content'
    return render(request, 'main/index.html', context)

def redirect_to_index(request, exception=None):
    return redirect('/')

def layer_thumbnail(request, pk):
    layer_instance = models.Layer.objects.filter(pk=pk).first()
    if layer_instance:
        thumbnail = layer_instance.generate_thumbnail()
        if thumbnail:
            return HttpResponse(thumbnail.read(), content_type='image/png')
    return 