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
from helpers.base.utils import get_decoded_response

def guess_format_from_url(url):
    if not url:
        return
    
    decoded_response = get_decoded_response(url)
    if not decoded_response:
        return 'file'

    return get_first_substring_match(decoded_response+url, {
        'file': [
            'download',
            'zip',
        ],
        'csv': [
            'table',
        ],
        'geojson': [
            'json',
            'featurecollection',
            'features',
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

DEFAULT_COLLECTION_DATA = {
    'collection':None, 
    'cacheKey': None, 
    'layers':{}
}

def get_collection_data(url, format=None, delay=True):
    format = format or guess_format_from_url(url)
    if not validators.url(url) or not format:
        return
    
    data = DEFAULT_COLLECTION_DATA

    # normalize url based on format here
    url = unquote(url)
    cacheKey = create_cache_key(['onboard_collection', url, format])
    data['cacheKey'] = cacheKey

    cached_collection = cache.get(cacheKey)
    if cached_collection:
        layers = cached_collection['layers']
        if len(layers.keys()) > 0:
            data['layers'] = layers
            return data

    collection_instance = Collection.objects.filter(
        url__path=url,
        format=format
    ).first()
    if collection_instance:
        layers = collection_instance.get_layer_data()
        if len(layers.keys()) > 0:
            data.update({'layers': layers, 'collection': collection_instance})
            return data

    layers = get_layers(url, format)
    if len(layers.keys()) > 0:
        data['layers'] = layers

        cache.set(cacheKey, {'url': url, 'format': format, 'layers': layers}, timeout=60*60*24*30)
        if delay:
            onboard_collection.delay(cacheKey)
        else:
            onboard_collection(cacheKey)
    return data
