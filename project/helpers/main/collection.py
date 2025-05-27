from django.core.cache import cache

import validators
from urllib.parse import unquote

from main.tasks import onboard_collection
from main.models import Collection
from helpers.base.utils import (
    get_first_substring_match, 
    create_cache_key, 
    ok_url_response
)
from helpers.base.files import get_file_names
from helpers.base.utils import is_text_response

def guess_format_from_url(url):
    if not url:
        return
    
    if not is_text_response(url):
        return 'file'

    return get_first_substring_match(url, {
        'file': [
            'download',
            'zip',
        ],
        'csv': [
            'table',
            
        ],
        'geojson': [
            'json',
        ],
    })

def get_layers(url, format):
    if format in ['geojson', 'csv']:
        if ok_url_response(url):
            name = url.split('/')[-1]
            return {name: {
                'title': name,
                'type': format,
            }}
    
    if format == 'file':
        filenames = get_file_names(url)
        return {i:{
            'title': i.split('/')[-1].split('.')[0],
            'type': i.split('.')[-1],
        } for i in filenames}
    
    return {}

def sort_layers(layers):
    return dict(sorted(layers.items(), key=lambda x: (x[1]["type"], x[1]["title"])))

def get_collection_layers(url, format=None, delay=True):
    format = format or guess_format_from_url(url)
    layers = {}

    if validators.url(url) and format:
        url = unquote(url)
        
        # normalize url based on format here
        cacheKey = create_cache_key(['onboard_collection', url, format])

        cached_collection = cache.get(cacheKey)
        if cached_collection:
            layers = cached_collection['layers']
            if len(layers.keys()) > 0:
                return layers

        collection_instance = Collection.objects.filter(
            url__path=url,
            format=format
        ).first()
        if collection_instance:
            layers = collection_instance.get_layer_data()
            if len(layers.keys()) > 0:
                return layers

        layers = get_layers(url, format)
        if len(layers.keys()) > 0:
            cache.set(cacheKey, {
                'url': url,
                'format': format,
                'layers': layers,
            }, timeout=60*60*24*30)

            if delay:
                onboard_collection.delay(cacheKey)
            else:
                onboard_collection(cacheKey)

    return layers
