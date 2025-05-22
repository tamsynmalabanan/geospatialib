
import json

from helpers.base.utils import get_response

def validate_geojson(url, name=None):
    response, status = get_response(url)
    if not status or (status < 200 or status >= 400):
        return
    
    try:
        geojson_data = response.json()
        print(geojson_data)
        print(json.dumps(geojson_data, indent=4))
    except:
        pass

def validate_csv(url, name=None):
    pass

def validate_file(url, name=None):
    pass

LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}