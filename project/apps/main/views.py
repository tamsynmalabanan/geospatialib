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
    datasets = models.Dataset.objects.all()
    for dataset in datasets:
        tags_text = dataset.tags_text
        if not tags_text or tags_text == '':
            if dataset.tags.exists():
                tags = ' '.join(dataset.tags.values_list('tag', flat=True))
                dataset.tags_text = tags
                dataset.save()
                print(dataset, tags)

    return HttpResponse('Done running. Check service logs.')