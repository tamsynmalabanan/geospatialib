from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.core.cache import cache
from django.db.models import QuerySet, Count, Sum, F, IntegerField, Value, Q, Case, When, Max, TextField, CharField, FloatField
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline


import json
import geojson
import pandas as pd, geopandas as gpd
import io
from fiona.io import MemoryFile
from urllib.parse import unquote
import osm2geojson
import codecs
import os
from functools import cached_property


from main.models import SpatialRefSys, Layer
from helpers.base.utils import get_response, get_response_file
from helpers.base.files import extract_zip
from helpers.main.constants import WORLD_GEOM, LONGITUDE_ALIASES, LATITUDE_ALIASES, QUERY_BLACKLIST
from helpers.base.utils import create_cache_key, get_special_characters


import logging
logger = logging.getLogger('django')

DEFAULT_SRID = SpatialRefSys.objects.filter(srid=4326).first()

class FilteredLayers():
    min_keyword_length = 3
    filter_fields = ['type']
    filter_expressions = ['bbox__bboverlaps']

    def __init__(self, params:dict, cache_pks:bool=True, cache_timeout:int=600):
        self.params = params
        self.cache_pks = cache_pks
        self.cache_timeout = cache_timeout
        self.set_clean_keywords()
        self.set_raw_query()
        self.set_clean_filters()
        self.set_filter_values()
        self.set_cache_key()

    def set_clean_keywords(self):
        query = self.params.get('query', '').strip().lower()
        for i in ['\'', '"']:
            query = query.replace(i, '')

        if ' -' in f' {query}':
            split_query = query.split()
            self.exclusions = sorted(set([
                i[1:] for i in split_query 
                if i.startswith('-') 
                and len(i) > self.min_keyword_length
            ]))
            query = ' '.join([
                i for i in split_query
                if not i.startswith('-') 
                and i not in self.exclusions
            ])
        else:
            self.exclusions = []

        for i in get_special_characters(query):
            query = query.replace(i, ' ')

        self.query = sorted(set([
            i for i in query.split() 
            if len(i) >= self.min_keyword_length 
            and i not in QUERY_BLACKLIST
        ]))

    def set_raw_query(self):
        self.raw_query = f'({' | '.join(
            [f"'{i}'" for i in self.query]
        )}){f' & !({' | '.join(
            [f"'{i}'" for i in self.exclusions]
        )})' if self.exclusions else ''}'

    def set_clean_filters(self):
        self.clean_filters = {
            key: value for key, value in self.params.items()
            if key in self.filter_fields + self.filter_expressions
            and value not in ['', None]
        }

    def set_filter_values(self):
        self.filter_values = sorted([str(v).strip() for v in self.clean_filters.values()])

    def set_cache_key(self):
        self.cache_key = create_cache_key([
            self.__class__.__name__, 
            self.raw_query
        ] + self.filter_values)

    def get_cached_pks(self):
        return cache.get(self.cache_key)

    def get_cached_queryset(self):
        pk_list = self.get_cached_pks()
        if not pk_list:
            return Layer.objects.none()
        return (
            Layer.objects.all()
            .select_related('collection__url')
            .filter(pk__in=pk_list)
            .order_by(Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(pk_list)]))
        )

    def get_filtered_queryset(self):
        if not self.query:
            return Layer.objects.none()

        queryset = (
            Layer.objects.all()
            .select_related('collection__url')
        )

        if self.filter_values:
            queryset = queryset.filter(**self.clean_filters)
        
        queryset = (
            queryset
            .filter(search_vector=SearchQuery(self.raw_query, search_type='raw'))
            .annotate(rank=Max(SearchRank(F('search_vector'), SearchQuery(
                ' OR '.join(self.query), 
                search_type='websearch')))
            )
            .order_by(*['-rank', 'title', 'type'])
        )[:1000]

        return queryset

    def get_queryset(self):
        queryset = self.get_cached_queryset()

        if not queryset.exists():
            queryset = self.get_filtered_queryset()
            if queryset.exists() and self.cache_pks and self.cache_timeout:
                cache.set(self.cache_key, queryset.values_list('pk', flat=True), timeout=self.cache_timeout)

        return queryset

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
        raise Exception('Failed to get bbox.')

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
        logger.error(f'csv_to_geojson, {e}')
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
        response = get_response(url, raise_for_status=True)
        geojson_obj, srid = get_geojson_metadata(json.dumps(response.json()).encode())
        
        params['bbox'] = get_geojson_bbox_polygon(geojson_obj, srid.srid)
        params['srid'] = srid
        return params
    except Exception as e:
        logger.error(f'validate_geojson, {e}')
            
def validate_osm(url, name, params):
    try:
        response = get_response(url, raise_for_status=True)
        text = response.text
        
        if text.startswith('{'):
            geojson_obj = osm2geojson.json2geojson(json.loads(text), filter_used_refs=False, log_level='INFO')
        else:
            geojson_obj = osm2geojson.xml2geojson(text, filter_used_refs=False, log_level='INFO')

        params['bbox'] = get_geojson_bbox_polygon(geojson_obj)
        params['srid'] = DEFAULT_SRID
        return params
    except Exception as e:
        logger.error(f'validate_osm, {e}')

def validate_overpass(url, name, params):
    try:
        params['bbox'] = WORLD_GEOM
        params['srid'] = DEFAULT_SRID
        return params
    except Exception as e:
        logger.error(f'validate_overpass, {e}')

def validate_csv(url, name, params):
    try:
        response = get_response(url, raise_for_status=True)
        geojson_obj, params = csv_to_geojson(io.StringIO(response.text), params)
        srid = SpatialRefSys.objects.filter(srid=int(params.get('srid',4326))).first() 

        params['bbox'] = get_geojson_bbox_polygon(geojson_obj, srid.srid)
        params['srid'] = srid
        return params
    except Exception as e:
        logger.error(f'validate_csv, {e}')

def validate_file(url, name, params):
    try:
        file_details = get_response_file(url)
        if not file_details:
            raise Exception('Failed to download file.')
        
        file = file_details.get('file')
        filename = file_details.get('filename','')
        
        if "zip" in file_details.get('content_type', ''):
            files = extract_zip(file, filename)
            file = files.get(os.path.normpath(name))
        
        geojson_obj = None
        srid = DEFAULT_SRID

        if name.endswith('.csv'):
            srid = SpatialRefSys.objects.filter(srid=int(params.get('srid', 4326))).first()
            geojson_obj, params = csv_to_geojson(file, params)

        if name.endswith('.geojson'):
            geojson_obj, srid = get_geojson_metadata(file)

        if not geojson_obj:
            try:
                content = file.getvalue().decode('utf-8')
                if any([i for i in ['osm', 'openstreetmap'] if i in content.lower()]):
                    if content.startswith('{'):
                        geojson_obj = osm2geojson.json2geojson(json.loads(content))
                    else:
                        geojson_obj = osm2geojson.xml2geojson(content)
            except Exception as e:
                pass

        if not geojson_obj:
            raise Exception('No valid geojson.')

        params['bbox'] = get_geojson_bbox_polygon(geojson_obj, srid.srid)
        params['srid'] = srid
        return params
    except Exception as e:
        logger.error(f'validate_file error, {e}')
       
def validate_xyz(url, name, params):
    try:
        params['bbox'] = WORLD_GEOM
        params['srid'] = DEFAULT_SRID
        return params
    except Exception as e:
        logger.error(f'validate_xyz, {e}')
       
def validate_ogc(url, name, params):
    try:
        srid = SpatialRefSys.objects.filter(srid=params.get('srid', 4326)).first()
        params['srid'] = srid

        w,s,e,n,*crs = params.get('bbox')
        params['bbox'] = Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)])

        return params
    except Exception as e:
        logger.error(f'validate_ogc, {e}')
       
LAYER_VALIDATORS = {
    'overpass': validate_overpass,
    'osm': validate_osm,
    'geojson': validate_geojson,
    'csv': validate_csv,
    'file': validate_file,
    'xyz': validate_xyz,
    'ogc-wfs': validate_ogc,
    'ogc-wms': validate_ogc,
    # 'ogc-wcs': validate_ogc,
}