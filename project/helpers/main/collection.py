from django.core.cache import cache
from django.utils import timezone

import os
from urllib.parse import unquote
from datetime import timedelta

from main.tasks import onboard_collection
from main.models import Collection
from helpers.base.utils import (
    get_first_substring_match, 
    create_cache_key, 
    get_response,
    get_decoded_response, 
    get_domain_name, 
    get_domain, 
    split_by_special_characters,
    get_keywords_from_url,
)
from helpers.base.files import get_file_names
from helpers.main.layers import format_url, WORLD_GEOM
from helpers.main.ogc import get_ogc_layers
from helpers.main.constants import XYZ_TILES_CHARS

import logging
logger = logging.getLogger('django')

def guess_format_from_url(url):
    if not url:
        return
    
    if any([i for i in XYZ_TILES_CHARS if i in url]):
        return 'xyz'
    
    try:
        response = get_response(url, raise_for_status=False)
        response.raise_for_status()

        decoded_response = get_decoded_response(response)
        if not decoded_response:
            return 'file'
    except:
        pass

    return get_first_substring_match(url, {
        # 'ogc-wcs': [
        #     'wcs',
        #     'mapserv',
        #     'geoserver',
        #     '2.0.1',
        # ],
        'ogc-wms': [
            'wms',
            'mapserv',
            'geoserver',
            '1.1.1',
            '1.3.0'
        ],
        'ogc-wfs': [
            'wfs',
            'mapserv',
            'geoserver',
        ],
        'csv': [
        ],
        'geojson': [
            'json',
        ],
    })

def get_layers(url, format):
    layers = {}

    try:
        if format.startswith('ogc-'):
            layers = get_ogc_layers(url, format)

        response = get_response(
            url=format_url(url, format),
            header_only=True,
            raise_for_status=False,
        )

        if response.status_code == 404:
            response.raise_for_status()

        url = unquote(url)

        if format in ['geojson', 'csv']:
            name = os.path.normpath(url).split(os.sep)[-1]
            layers = {name: {
                'title': '.'.join(name.split('.')[:-1]) if name.endswith(f'.{format}') else name,
                'type': format,
            }}
            
        if format == 'xyz':
            name = (' '.join([get_domain_name(url)]+[
                i for i in os.path.normpath(url.split(get_domain(url))[-1]).split(os.sep) 
                if i != '' and not any([j for j in XYZ_TILES_CHARS if j in i])
            ])).strip()
            
            layers = {name: {
                'title': name,
                'type': format,
                'bbox': list(WORLD_GEOM.extent),
            }}
        
        if format == 'file':
            layers = {i:{
                'title': '.'.join(os.path.normpath(i).split(os.sep)[-1].split('.')[:-1]),
                'type': i.split('.')[-1],
            } for i in get_file_names(url)}
    except Exception as e:
        logger.error(f'get layers, {e}')

    keywords = get_keywords_from_url(url)

    for name, params in layers.items():
        params['keywords'] = params.get('keywords', []) + keywords
        layers[name] = params

    return layers

def sort_layers(layers):
    return dict(sorted(layers.items(), key=lambda x: (x[1]["type"], x[1]["title"])))

def get_collection_data(url, format=None, delay=True):
    if not url:
        return
    
    format = format or guess_format_from_url(url)
    if not format:
        return
    
    url = url if format == 'xyz' else format_url(url, format)
    cache_key = create_cache_key(['onboard_collection', url, format])

    data = {'layers':{}, 'cache_key':cache_key, 'url':url, 'format':format}

    collection = Collection.objects.filter(
        url__path=url,
        format=format,
        layers__isnull=False,
        last_update__gte=timezone.now()-timedelta(days=1)
    ).first()

    cached_layers = cache.get(cache_key, {}).get('layers', {})
    cached_layers_count = len(cached_layers.keys())

    if collection and collection.layers.count() >= cached_layers_count:
        layers = collection.get_layers()
        data.update({'layers': layers, 'collection': collection})
        return data

    if cached_layers_count > 0:
        data['layers'] = cached_layers
    else:
        layers = get_layers(url, format)
        if len(layers.keys()) > 0:
            data['layers'] = layers
        cache.set(cache_key, data, timeout=60*15)
    
    if delay:
        onboard_collection.delay(cache_key)
    else:
        onboard_collection(cache_key)

    return data

def update_collection_data(cache_key, updated_layers, delay=True):
    collection_data = cache.get(cache_key)

    if collection_data:
        cached_layers = collection_data.get('layers', {})

        for name, new_params in updated_layers.items():
            cached_params = cached_layers.get(name, {})
            
            for key, value in new_params.items():
                if key == 'title' or value is None:
                    new_params[key] = cached_params.get(key, value)

            for key, value in cached_params.items():
                if new_params.get(key) is None:
                    new_params[key] = value

            cached_layers[name] = new_params
        
        collection_data['layers'] = cached_layers
    else:
        fn, url, format = cache_key.split(';')
        collection_data = {
            'url': url,
            'format': format,
            'layers': updated_layers,
        }
    
    cache.set(cache_key, collection_data, timeout=60*15)
    
    if delay:
        onboard_collection.delay(cache_key)
    else:
        onboard_collection(cache_key)
    
    return collection_data