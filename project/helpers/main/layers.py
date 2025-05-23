from django.contrib.gis.geos import GEOSGeometry, Polygon

import json
import geojson
import pandas as pd, geopandas as gpd
import io

from helpers.base.utils import get_valid_response, get_response_file
from helpers.base.files import extract_zip

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

def csv_to_geojson(file, params):
    try:
        df = pd.read_csv(file)

        xField = params['xField'] = params.get('xField', ([i for i in df.columns if i.strip().lower() in LONGITUDE_ALIASES]+[None])[0])
        yField = params['yField'] = params.get('yField', ([i for i in df.columns if i.strip().lower() in LATITUDE_ALIASES]+[None])[0])
        if not xField or not yField:
            raise Exception('No valid coordinate fields.')
        
        gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[xField], df[yField]))
        return geojson.loads(gdf.to_json()), params
    except Exception as e:
        print(e)
        return None, None

def validate_geojson(url, name, params):
    try:
        response = get_valid_response(url)
        if not response:
            raise Exception('No valid response.')

        geojson_obj = geojson.loads(response.text)
        if not geojson_obj.is_valid:
            raise Exception('Invalif geojson.')
        return {
            'name': name,
            'params': params,
            'bbox':get_geojson_bbox_polygon(geojson_obj)
        }
    except Exception as e:
        print(e)

def validate_csv(url, name, params):
    try:
        response = get_valid_response(url)
        if not response:
            raise Exception('No valid response.')

        data = io.StringIO(response.text)
        geojson_obj, params = csv_to_geojson(data, params)
        if not geojson_obj:
            raise Exception('No valid geojson.')

        return {
            'name': name,
            'params': params,
            'bbox':get_geojson_bbox_polygon(geojson_obj)
        }
    except Exception as e:
        print(e)

def validate_file(url, name, params):
    try:
        file_details = get_response_file(url)
        if not file_details:
            raise Exception('Failed to download file.')
        
        file = file_details.get('file')
        filename = file_details.get('filename','')
        
        if "zip" in file_details.get('content_type', ''):
            file = extract_zip(file, filename).get(name)
        
        geojson_obj = None

        if name.endswith('.csv'):
            geojson_obj, params = csv_to_geojson(file, params)

        if name.endswith('.geojson'):
            print(file.read().decode("utf-8"))

        if not geojson_obj:
            raise Exception('No valid geojson.')

        return {
            'name': name,
            'params': params,
            'bbox':get_geojson_bbox_polygon(geojson_obj)
        }
    except Exception as e:
        print(e)
        

LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}