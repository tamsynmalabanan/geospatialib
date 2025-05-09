import validators
from urllib.parse import unquote

def get_layers_names(url, format):
    url_clean = unquote(url)
    if format == 'geojson':
        return [url_clean.split('/')[-1].replace('.geojson', '')]
    return []

def get_format(url):
    if url.endswith('.geojson'):
        return 'geojson'
    return None

def get_collection(url, format=None):
    # check if url and or format already an existing collection
    # if not existing, and if valid, onboard

    url_value = url if validators.url(url) else False
    format_value = format
    names_value = []

    if url_value:
        format_value = format if format and format != '' else get_format(url)

    if url_value and format_value:
        names_value = get_layers_names(url_value, format_value)
        if len(names_value) == 0:
            format_value = False if format and format != '' else ''

    return {
        'url': url_value,
        'format': format_value,
        'names': names_value,
    }
