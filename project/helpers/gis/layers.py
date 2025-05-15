from django.utils.text import slugify

import validators
from urllib.parse import unquote

from helpers.general.utils import get_first_substring_match
from helpers.general.files import get_file_info

def get_format(url):
    return get_first_substring_match(url, {
    'file': [
        'download',
        '.zip',
    ],
    'geojson': [
        'geojson',
        'gjson',
        'json',
    ],
})

def get_layers_names(url, format):
    if format == 'geojson':
        name = url.split('/')[-1].split('.')[0]
        return {name: name}
    
    if format == 'file': 
        return get_file_info(url)
    
    return {}


def get_collection(url, format=None):
    url_value = unquote(url) if validators.url(url) else False
    format_value = format or (get_format(url_value) if url_value else format)
    names_value = {}

    print(url_value, format_value)
    if url_value and format_value:
        # check if url and or format already an existing collection
        # if not existing, and if valid, onboard

        names_value = get_layers_names(url_value, format_value)
        if len(names_value.keys()) == 0:
            format_value = False if format and format != '' else ''
        print(url_value, format_value)

    return {
        'url': url_value,
        'format': format_value,
        'names': names_value,
    }
