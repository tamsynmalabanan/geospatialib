from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

import os
from urllib.parse import unquote, urlparse, parse_qs, quote

from datetime import timedelta

from main.tasks import onboard_collection
from main.models import Collection, SpatialRefSys
from helpers.base.utils import (
    get_first_substring_match, 
    create_cache_key, 
    get_response,
    get_decoded_response, 
    get_domain_name, 
    get_domain, 
    split_by_special_characters,
    get_keywords_from_url,
    remove_query_params,
    get_domain_url,
)
from helpers.base.files import get_file_names
from helpers.main.layers import WORLD_GEOM
from helpers.main.utils import get_clean_url
from helpers.main.ogc import get_ogc_layers
from helpers.main.constants import XYZ_TILES_CHARS

import logging
logger = logging.getLogger('django')


def guess_format_from_url(url):
    if not url:
        return
    
    if any([i for i in XYZ_TILES_CHARS if i in url]):
        return 'xyz'
    
    response = get_response(url)
    if response and not get_decoded_response(response):
        return 'file'

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
        'gpx': [
        ],
        'geojson': [
        ],
        'overpass': [
        ],
        'osm': [
        ],
    })

def get_layers(url, format):
    layers = {}

    try:
        if format.startswith('ogc-'):
            layers = get_ogc_layers(url, format)
        else:
            response = get_response(
                url=get_clean_url(url, format),
                raise_for_status=False,
            )

            if response.status_code == 404:
                response.raise_for_status()

            url = unquote(url)

            if format in ['geojson', 'csv', 'gpx', 'osm']:
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
                for i in get_file_names(url):
                    i = i.replace('\\', '/')
                    filename = os.path.normpath(i).split('/')[-1].split(os.sep)[-1]
                    layers[i] = {
                        'title': '.'.join(filename.split('.')[:-1]) if '.' in filename else filename,
                        'type': filename.split('.')[-1] if '.' in filename else 'unknown',
                    }

            if format == 'overpass':
                parts = parse_qs(urlparse(url).query).get('data', [''])[0].split(';')
                tags = []
                for part in parts:
                    object_type = [i for i in ['node', 'way', 'relation'] if i in part]
                    if object_type:
                        tag = part.split(object_type[0])[1].split('(')[0]
                        tags.append(tag)
                layers = {tag: {
                    'title': tag,
                    'tags': tag,
                    'type': 'overpass',
                    'bbox': list(WORLD_GEOM.extent),
                } for tag in list(set(tags))}
    except Exception as e:
        logger.error(f'get layers, {e}')

    keywords = get_keywords_from_url(url)

    for name, params in layers.items():
        params['keywords'] = params.get('keywords', []) + keywords
        layers[name] = params

    return layers

def sort_layers(layers):
    return dict(sorted(layers.items(), key=lambda x: (x[1]["type"], x[1]["title"])))

def get_collection_data(url, format=None):
    if not url:
        return
        
    format = format or guess_format_from_url(url)
    if not format:
        return
    
    clean_url = get_clean_url(url, format, exclusions=['xyz'])
    cache_key = create_cache_key(['onboard_collection', url, format])

    data = {
        'layers': {}, 
        'cache_key': cache_key, 
        'url': clean_url, 
        'format': format
    }

    collection = Collection.objects.filter(
        url__path=clean_url,
        format=format,
        layers__isnull=False,
        dynamic=False,
        last_update__gte=timezone.now()-timedelta(days=7)
    ).first()

    cached_layers = cache.get(cache_key, {}).get('layers', {})
    cached_layers_count = len(cached_layers.keys())

    if collection and collection.layers.count() >= cached_layers_count:
        layers = collection.get_layers()
        data.update({'layers': layers, 'collection': collection})
        return data

    if cached_layers_count > 0 and format not in ['gpx']:
        data['layers'] = cached_layers
        return data
    
    layers = get_layers(url, format)
    if len(layers) > 0:
        data['layers'] = layers
        cache.set(cache_key, data, timeout=60*60)
    
        try:
            if settings.DEBUG:
                onboard_collection(cache_key)
            else:
                onboard_collection.delay(cache_key)
        except Exception as e:
            logger.error(f'onboard collection error: {e}')

    return data

def update_collection_data(cache_key, updated_layers):
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
    
    cache.set(cache_key, collection_data, timeout=60*60)
    
    if settings.DEBUG:
        onboard_collection(cache_key)
    else:
        onboard_collection.delay(cache_key)
    
    return collection_data