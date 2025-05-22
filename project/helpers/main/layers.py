from django.contrib.gis.geos import GEOSGeometry, Polygon

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
        if not geojson_obj.is_valid:
            return

        geometries = [
            GEOSGeometry(json.dumps(feature["geometry"])) 
            for feature in geojson_obj.get("features", [])
        ]
        
        minx, miny, maxx, maxy = float("inf"), float("inf"), float("-inf"), float("-inf")
        for geom in geometries:
            bbox = geom.extent
            minx = min(minx, bbox[0])
            miny = min(miny, bbox[1])
            maxx = max(maxx, bbox[2])
            maxy = max(maxy, bbox[3])

        bbox = Polygon(((minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy), (minx, miny)))
        return {'bbox':bbox}
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