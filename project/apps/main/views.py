from django.shortcuts import render, redirect, HttpResponse
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout
from django.contrib import messages

from urllib.parse import urlparse, parse_qs

from utils.gis import dataset_helpers

def test(request):
    url = 'https://geo.rijkswaterstaat.nl/services/ogc/gdr/militaire_gebieden/ows?service=WFS&request=GetFeature&version=2.0.0'
    handler = dataset_helpers.OGCHandlers('wfs', url)
    service = handler.get_service()
    # layers = handler.get_layers(service)
    layer_name = 'militaire_gebieden:militaire_gebieden'
    layer = service[layer_name]

    print(
        service,
        layer,
    )
    return HttpResponse('test')