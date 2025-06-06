from django.core.cache import cache


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
from helpers.main.layers import format_url, WORLD_GEOM
from helpers.main.ogc import get_wms_layers

XYZ_TILES_CHARS = ['{', '}', '%7B', '%7D']

def guess_format_from_url(url):
    if not url:
        return
    
    if any([i for i in XYZ_TILES_CHARS if i in url]):
        return 'xyz'
    
    decoded_response = get_decoded_response(url)
    if not decoded_response:
        return 'file'

    return get_first_substring_match(url, {
        'ogc-wms': [
            'wms',
        ],
        'csv': [
        ],
        'geojson': [
            'json',
        ],
    })

def get_layers(url, format):
    try:
        if format.startswith('ogc-'):
            return get_wms_layers(url)

        response = get_response(
            url=format_url(url, format),
            header_only=True,
            raise_for_status=False,
        )
        print(response)
        if response.status_code == 404:
            response.raise_for_status()

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
                'bbox': list(WORLD_GEOM.extent),
            }}
        
        if format == 'file':
            filenames = get_file_names(url)
            return {i:{
                'title': i.split('/')[-1].split('.')[0],
                'type': i.split('.')[-1],
            } for i in filenames}
        
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

    data = {'layers':{}, 'cacheKey':cacheKey, 'url':url, 'format':format}

    collection_instance = Collection.objects.filter(
        url__path=url, format=format
    ).first()
    if collection_instance:
        layers = collection_instance.get_layer_data()
        if len(layers.keys()) == collection_instance.count:
            for name in layers.keys():
                layers[name]['bbox'] = list(layers[name]['bbox'].extent)
            data.update({'layers': layers, 'collection': collection_instance})
            return data

    cached_collection = cache.get(cacheKey)
    if cached_collection:
        layers = cached_collection['layers']
        if len(layers.keys()) > 0:
            data['layers'] = layers
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
            for key, value in params.items():
                if key == 'title' or not value:
                    params[key] = cached_layers.get(name, {}).get(key, value)
                else:
                    params[key] = value                
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