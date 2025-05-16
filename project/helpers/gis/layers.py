from django.core.cache import cache

import validators
from urllib.parse import unquote

from main.tasks import onboard_collection
from helpers.general.utils import get_first_substring_match, create_cache_key
from helpers.general.files import get_file_names

def guess_format_via_url(url):
    return get_first_substring_match(url, {
        'file': [
            'download',
            'zip',
        ],
        'geojson': [
            'geojson',
            'gjson',
            'json',
        ],
    })

def get_layer_names(url, format):
    if format == 'geojson':
        name = url.split('/')[-1].split('.')[0]
        return {name: name}
    
    if format == 'file':
        return get_file_names(url)
    
    return {}

def get_collection(url, format=None):
    collection = {'names': {}}
    url_value = collection['url'] = unquote(url) if validators.url(url) else False
    format_value = collection['format'] = format or guess_format_via_url(url_value) or ''

    if url_value and format_value:
        # normalize url based on format here
        cacheKey = create_cache_key(['onboard_collection', url_value, format_value])

        cached_collection = cache.get(cacheKey)
        if cached_collection and len(cached_collection['names'].keys()) > 0:
            return cached_collection

        # 1. check if url and format already an existing collection
        # 2. if collection exists, get collection layers and return collection {}

        names_value = collection['names'] = get_layer_names(url_value, format_value)
        if len(names_value.keys()) > 0:
            # if layer names retrieved, cache collection variables
            cache.set(cacheKey, collection, timeout=60*60*24*30)
            onboard_collection.delay(cacheKey)
        else: 
            collection['format'] = False if format else ''

    return collection
