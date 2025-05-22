from django.contrib.gis.geos import GEOSGeometry, Polygon

import json
import geojson
import pandas as pd, geopandas as gpd
import io

from helpers.base.utils import get_response

LONGITUDE_ALIASES = [
    'x', 'lon', 'long', 'lng', 'longitude', 'easting', 'westing',
    'lambda', 'meridian', 'geo_x', 'geom_x', 'x_coord', 
    'east_west', 'west_east', 'horizontal_position', 'east', 'west'
]

LATITUDE_ALIASES = [
    'y', 'lat', 'latitude', 'northing', 'southing',
    'phi', 'parallel', 'geo_y', 'geom_y', 'y_coord',
    'north_south', 'south_north', 'vertical_position', 'north', 'south'
]

def get_geojson_bbox_polygon(geojson):
    geometries = [
        GEOSGeometry(json.dumps(feature["geometry"])) 
        for feature in geojson.get("features", [])
    ]

    minx, miny, maxx, maxy = float("inf"), float("inf"), float("-inf"), float("-inf")
    for geom in geometries:
        bbox = geom.extent
        minx = min(minx, bbox[0])
        miny = min(miny, bbox[1])
        maxx = max(maxx, bbox[2])
        maxy = max(maxy, bbox[3])

    return Polygon(((minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy), (minx, miny)))

def validate_geojson(url, name=None):
    response, status = get_response(url)
    if not status or (status < 200 or status >= 400):
        return
    
    try:
        geojson_obj = geojson.loads(response.text)
        if not geojson_obj.is_valid:
            return
        return {'bbox':get_geojson_bbox_polygon(geojson_obj)}
    except Exception as e:
        print(e)

def validate_csv(url, name, params):
    response, status = get_response(url)
    if not status or (status < 200 or status >= 400):
        return
    
    try:
        data = io.StringIO(response.text)
        df = pd.read_csv(data)

        xField = params.get('xField', ([i for i in df.columns if i.strip().lower() in LONGITUDE_ALIASES]+[None])[0])
        yField = params.get('yField', ([i for i in df.columns if i.strip().lower() in LATITUDE_ALIASES]+[None])[0])
        gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[xField], df[yField]))
        geojson_str = gdf.to_json()
        geojson_obj = json.loads(geojson_str)
        print(geojson_obj)
    except Exception as e:
        print(e)

def validate_file(url, name=None):
    pass

LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}