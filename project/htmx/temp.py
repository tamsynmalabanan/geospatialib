from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse, get_object_or_404
from django.http import JsonResponse
from django.contrib import messages
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.views.generic import ListView
from django.db.models import QuerySet, Count, Sum, F, IntegerField, Value, Q, Case, When, Max, TextField, CharField, FloatField
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline
from django.utils.functional import cached_property

import json
import requests
import validators
import os
from functools import reduce
from operator import or_, add
from urllib.parse import urlparse

from helpers.main.collection import get_collection_data, sort_layers, update_collection_data
from main.models import SpatialRefSys, URL, Layer
from main.forms import ValidateCollectionForm
from main.tasks import onboard_collection
from main import forms
from helpers.base.utils import create_cache_key, find_nearest_divisible


class SearchList(ListView):
    template_name = 'main/search/results.html'
    model = Layer
    context_object_name = 'layers'
    paginate_by = 24

    @cached_property
    def filter_fields(self):
        return [
            'type',
        ]

    @cached_property
    def filter_expressions(self):
        return [
            'bbox__bboverlaps'
        ]

    @cached_property
    def query_filters(self):
        return self.filter_fields + self.filter_expressions

    @cached_property
    def query_values(self):
        query = self.request.GET.get('query', '').strip()
        exclusions = []

        if ' -' in f' {query}':
            keywords = query.split(' ')
            exclusions = [i[1:] for i in keywords if i.startswith('-') and len(i) > 1]
            query = ' '.join([i for i in keywords if not i.startswith('-') and i != ''])
        query = query.replace(' ', ' OR ')

        return (query, exclusions)

    @cached_property
    def query_params(self):
        return [i for i in list(self.request.GET.values()) if i and i != '']

    @cached_property
    def cache_key(self):
        return ';'.join([str(i) for i in ['SearchList',]+self.query_params])

    def perform_full_text_search(self):
        query, exclusions = self.query_values

        queryset = (
            super().get_queryset()
            .select_related(
                'collection__url',
            )
        )

        if exclusions:
            queryset = queryset.exclude(reduce(
                or_, 
                (Q(name__icontains=word) | Q(title__icontains=word) for word in exclusions), 
                Q()
            ))

        search_query = SearchQuery(query, search_type='websearch')

        search_vector = reduce(add, (SearchVector(field) for field in self.filter_fields + [
            'name',
            'title',
            'abstract',
            'keywords',
            'attribution',
            'styles',
        ]))

        queryset = (
            queryset
            .annotate(rank=SearchRank(search_vector, search_query))
            .filter(rank__gte=0.001)
        )
        
        return queryset

    def apply_query_filters(self, queryset):
        return queryset.filter(**{
            param : value 
            for param, value in self.request.GET.items() 
            if value and param in self.query_filters
        })

    def get_queryset(self):
        if not hasattr(self, 'queryset') or getattr(self, 'queryset') is None:
            queryset = cache.get(self.cache_key)

            if not queryset or not queryset.exists():
                queryset = self.perform_full_text_search()

            if queryset.exists():
                queryset = self.apply_query_filters(queryset)
                cache.set(self.cache_key, queryset, timeout=60*15)
                
            self.queryset = queryset

        queryset = self.queryset
        if queryset and queryset.exists():
            queryset = (
                self.queryset
                .annotate(rank=Max('rank'))
                .order_by(*['-rank', 'title','type'])
            )

        return queryset

    def get_filters(self):
        filters = {
            field: list(
                self.queryset
                .values(field)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count')
            ) for field in self.filter_fields
        }

        for field in self.filter_fields:
            value = self.request.GET.get(field)
            if not value or len(filters.get(field, [])) != 0:
                continue
            filters[field] = [{field: value, 'count': 0}]

        return filters

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if context['page_obj'].number == 1:
            context['count'] = context['page_obj'].paginator.count
            context['filters'] = self.get_filters()
            context['params'] = self.query_params
        return context