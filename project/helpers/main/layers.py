from helpers.base.utils import get_response

def validate_geojson(url, name=None):
    response, status = get_response(url)
    print(response, status)

def validate_csv(url, name=None):
    pass

def validate_file(url, name=None):
    pass

LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}