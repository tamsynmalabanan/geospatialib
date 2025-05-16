from django.utils.text import slugify

import validators
from urllib.parse import unquote

from helpers.general.utils import get_first_substring_match
from helpers.general.files import get_file_names

def get_format(url):
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
    url_value = unquote(url) if validators.url(url) else False
    format_value = format or (get_format(url_value) if url_value else format)
    names_value = {}

    if url_value and format_value:
        # 3. check if collection variables already cached waiting to be onboarded
        # 4. if true, get and return cached collection variables

        # 1. check if url and format already an existing collection
        # 2. if collection exists, get collection layers and return collection {}

        # 5. if collection does not exist, get layer names
        try:
            names_value = get_layer_names(url_value, format_value)
        except Exception as e:
            pass

        if len(names_value.keys()) == 0:
            format_value = False if format and format != '' else ''
        else: 
            pass
            # if layer names retrieved, cache collection variables, call onboard_collection with cache key
            # onboard_collection should get cached collection variables and create collection and layers
            # when all layers are created, delete cached collection variables

    return {
        'url': url_value,
        'format': format_value,
        'names': names_value,
    }
