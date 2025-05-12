from django.utils.text import slugify

import validators
from urllib.parse import unquote

from helpers.general.utils import get_first_substring_match

LAYER_FORMATS = {
    'file': [
        'download',
        '.zip',
    ],
    'geojson': [
        'geojson',
        'gjson',
        'json',
    ],
}

def get_format(url):
    return get_first_substring_match(url, LAYER_FORMATS)

def get_layers_names(url, format):
    if format == 'geojson':
        name = url.split('/')[-1].split('.')[0]
        return {slugify(name):name}
    
    if format == 'file': 
        pass # fetch file/s

    return {}


def get_collection(url, format=None):
    # check if url and or format already an existing collection
    # if not existing, and if valid, onboard

    url_value = unquote(url) if validators.url(url) else False
    format_value = format
    names_value = {}

    if url_value:
        format_value = format if format and format != '' else get_format(url_value)

    if url_value and format_value:
        names_value = get_layers_names(url_value, format_value)
        if len(names_value.keys()) == 0:
            format_value = False if format and format != '' else ''

    return {
        'url': url_value,
        'format': format_value,
        'names': names_value,
    }
