from django.core.cache import cache

from owslib.wms import WebMapService

from main.tasks import onboard_collection
from main.models import Collection
from helpers.base.utils import (
    get_first_substring_match, 
    create_cache_key, 
    get_response,
    get_decoded_response, 
    get_domain_name, 
    get_domain, 
)
from helpers.base.files import get_file_names
from helpers.main.layers import format_url

XYZ_TILES_CHARS = ['{', '}', '%7B', '%7D']

def guess_format_from_url(url):
    if not url:
        return
    
    if any([i for i in XYZ_TILES_CHARS if i in url]):
        return 'xyz'
    
    decoded_response = get_decoded_response(url)
    if not decoded_response:
        return 'file'

    return get_first_substring_match(decoded_response+url, {
        'ogc-wms': [
            'wms',
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

def get_wms_layers(url):
    try:
        cacheKey = create_cache_key(['wms', url])
        wms = cache.get(cacheKey)
        if not wms:
            wms = WebMapService(url)
        else:
            cache.set(cacheKey, wms, 60*60)
        layer_names = list(wms.contents)
        return {i:wms[i].title for i in layer_names}
    except Exception as e:
        print('get_wms_layers', e)
    return {}

def get_layers(url, format):
    try:
        response = get_response(
            url=format_url(url, format),
            header_only=True,
            raise_for_status=True
        )
        if not response:
            return {}

        if format in ['geojson', 'csv']:
            name = url.split('/')[-1]
            return {name: {
                'title': name,
                'type': format,
            }}
            
        if format == 'xyz':
            name = (' '.join([get_domain_name(url)]+[i for i in url.split(get_domain(url))[-1].split('/') if i != '' and not any([j for j in XYZ_TILES_CHARS if j in i])])).strip()
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
        
        if format.startswith('ogc-'):
            layers = get_wms_layers(url)
            print(layers)
            return {key:{
                'title': value,
                'type': 'wms'
            } for key, value in layers.items()}
    except Exception as e:
        print(e)
        return {}

def sort_layers(layers):
    return dict(sorted(layers.items(), key=lambda x: (x[1]["type"], x[1]["title"])))

def get_collection_data(url, format=None, delay=True):
    if not url:
        return
    
    format = format or guess_format_from_url(url)
    if not format:
        return
    
    url = url if format == 'xyz' else format_url(url, format)
    cacheKey = create_cache_key(['onboard_collection', url, format])

    data = {'layers':{}, 'cacheKey':cacheKey}
    cached_collection = cache.get(cacheKey)
    if cached_collection:
        layers = cached_collection['layers']
        if len(layers.keys()) > 0:
            data['layers'] = layers
            return data

    collection_instance = Collection.objects.filter(
        url__path=url, format=format
    ).first()
    if collection_instance:
        layers = collection_instance.get_layer_data()
        if len(layers.keys()) == len(collection_instance.names):
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

def update_collection_data(cacheKey, updated_layers, delay=True):
    collection_data = cache.get(cacheKey)
    if collection_data:
        cached_layers = collection_data.get('layers', {})
        for name, params in updated_layers.items():
            params['title'] = cached_layers.get(name, {}).get('title', params.get('title', ''))
            cached_layers[name] = params
        collection_data['layers'] = cached_layers
    else:
        fn, url, format = cacheKey.split(';')
        collection_data = {
            'url': url,
            'format': format,
            'layers': updated_layers,
        }
    cache.set(cacheKey, collection_data, timeout=60*60*24*30)
    if delay:
        onboard_collection.delay(cacheKey)
    else:
        onboard_collection(cacheKey)
    return collection_data