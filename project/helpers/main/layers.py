from django.contrib.gis.geos import GEOSGeometry, Polygon

import json
import geojson
import pandas as pd, geopandas as gpd
import io
from fiona.io import MemoryFile

from main.models import SpatialRefSys
from helpers.base.utils import get_valid_response, get_response_file
from helpers.base.files import extract_zip

DEFAULT_SRID = SpatialRefSys.objects.filter(srid=4326).first()

WORLD_GEOM = GEOSGeometry(Polygon([
    (-180, -90), (180, -90), (180, 90), (-180, 90), (-180, -90)
]), srid=4326)


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

def features_to_geometries(features, srid=4326):
    geometries = []
    for feature in features:
        geometry = GEOSGeometry(json.dumps(feature["geometry"]))
        geometry.srid = srid
        if srid != 4326:
            geometry.transform(4326)
        geometries.append(geometry)
    return geometries

def get_geojson_bbox_polygon(geojson, srid=4326):
    geometries = features_to_geometries(geojson.get("features", []), srid)

    w, s, e, n = float("inf"), float("inf"), float("-inf"), float("-inf")
    for geom in geometries:
        bbox = geom.extent
        w = min(w, bbox[0])
        s = min(s, bbox[1])
        e = max(e, bbox[2])
        n = max(n, bbox[3])

    geojson_bbox = Polygon(((w, s), (e, s), (e, n), (w, n), (w, s)))
    if geojson_bbox.within(WORLD_GEOM):
        return geojson_bbox
    else:
        print('get_geojson_bbox_polygon', 'not within world')

def csv_to_geojson(file, params):
    try:
        df = pd.read_csv(file)

        xField = params['xField'] = params.get('xField', ([i for i in df.columns if i.strip().lower() in LONGITUDE_ALIASES+[j+'s' for j in LONGITUDE_ALIASES]]+[None])[0])
        yField = params['yField'] = params.get('yField', ([i for i in df.columns if i.strip().lower() in LATITUDE_ALIASES+[j+'s' for j in LATITUDE_ALIASES]]+[None])[0])
        if not xField or not yField:
            raise Exception('No valid coordinate fields.')
        
        gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[xField], df[yField]))
        return json.loads(gdf.to_json()), params
    except Exception as e:
        print(e)
        return None, None

def get_geojson_metadata(data):
    bounds = None
    srid = DEFAULT_SRID

    with MemoryFile(data) as memfile:
        with memfile.open() as src:
            srid = SpatialRefSys.objects.filter(
                srid=int(str(src.crs or '').split('EPSG:')[-1] or 4326)
            ).first()

            w,s,e,n = src.bounds
            bounds = geojson.FeatureCollection([geojson.Feature(
                    geometry=geojson.Polygon([[
                    (w, s), (e, s), (e, n), (w, n), (w, s)
                ]])
            )])

    return bounds, srid
            
def validate_geojson(url, name, params):
    try:
        response = get_valid_response(url)
        if not response:
            raise Exception('No valid response.')

        geojson_obj, srid = get_geojson_metadata(json.dumps(response.json()).encode())

        params.update({
            'bbox':get_geojson_bbox_polygon(geojson_obj, srid.srid),
            'srid': srid
        })

        return params
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

        params.update({
            'bbox':get_geojson_bbox_polygon(geojson_obj)
        })

        return params
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
            files = extract_zip(file, filename)
            file = files.get(name)
        
        geojson_obj = None
        srid = DEFAULT_SRID

        if name.endswith('.csv'):
            geojson_obj, params = csv_to_geojson(file, params)

        if name.endswith('.geojson'):
            geojson_obj, srid = get_geojson_metadata(file)

        if not geojson_obj:
            raise Exception('No valid geojson.')

        params.update({
            'bbox':get_geojson_bbox_polygon(geojson_obj, srid.srid),
            'srid': srid
        })

        return params
    except Exception as e:
        print('validate_file error', e)
       
LAYER_VALIDATORS = {
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
}