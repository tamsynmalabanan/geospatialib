from django.shortcuts import render, redirect, HttpResponse
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout
from django.contrib import messages

from urllib.parse import urlparse, parse_qs
from apps.library.models import Dataset
from utils.gis import dataset_helpers

import uuid

def test(request):
    datasets = Dataset.objects.all()
    for dataset in datasets:
        while True:
            uuid_value = uuid.uuid4
            if not Dataset.objects.filter(uuid=uuid_value).exists():
                dataset.uuid = uuid_value
                dataset.save()
                break
    return HttpResponse('test')