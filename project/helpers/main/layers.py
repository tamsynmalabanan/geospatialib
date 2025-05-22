from django.contrib.gis.geos import GEOSGeometry

import json
import geojson
from shapely.geometry import shape

from helpers.base.utils import get_response

def validate_geojson(url, name=None):
    response, status = get_response(url)
    if not status or (status < 200 or status >= 400):
        return
    
    try:
        geojson_data = response.json()
        geojson_obj = geojson.loads(json.dumps(geojson_data))
        if geojson_obj.is_valid:
            print("The data is valid GeoJSON!")
            geometries = [
                GEOSGeometry(json.dumps(feature["geometry"])) 
                for feature in geojson_obj.get("features", [])
            ]
            print(geometries)

    except Exception as e:
        print(e)

def validate_csv(url, name=None):
    pass

def validate_file(url, name=None):
    pass

LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}