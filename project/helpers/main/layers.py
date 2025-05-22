
import json, geojson

from helpers.base.utils import get_response

def validate_geojson(url, name=None):
    response, status = get_response(url)
    if not status or (status < 200 or status >= 400):
        return
    
    try:
        geojson_data = response.json()
        geojson_obj = geojson.loads(str(geojson_data))
        if geojson.is_valid(geojson_obj):
            print("The data is valid GeoJSON!")
        else:
            print("Invalid GeoJSON format.")
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