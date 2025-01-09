from django.shortcuts import render, redirect, HttpResponse
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout
from django.contrib import messages

from urllib.parse import urlparse, parse_qs
from apps.library.models import Dataset
from utils.gis import dataset_helpers
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers

def test(request):
    url_instances = (models.URL.objects
        .annotate(
            formats=ArrayAgg('datasets__format', distinct=True), 
            names=ArrayAgg('datasets__name', distinct=True),
        )
        .values(
            'url', 
            'formats', 
            'names', 
        )
        .filter(datasets__isnull=False)
        .distinct()
    )
    
    for url_instance in url_instances:
        url = url_instance['url']
        formats = url_instance['formats']
        names = url_instance['names']

        print(f'URL: {url}')
        print(f'EXISTING LAYERS: {names}')

        for format in formats:
            print(f'FORMAT: {format}')

            try:
                handler = dataset_helpers.get_dataset_handler(
                    format, 
                    url=url,
                )
                layers = list(handler.layers.keys())
                print(f'LAYERS: {layers}')

                new_layers = [layer for layer in layers if layer not in names]
                print(f'LAYERS TO ONBOARD: {new_layers}')

                for layer in new_layers[:1]:
                    print('NEW LAYER', layer)

            except Exception as e:
                print(f'LAYERS: FAILED TO RETRIEVE LAYERS', e)

        print('\n')

    print(f'TOTAL: {url_instances.count()}')

    return HttpResponse('Done running. Check service logs.')