from django.utils.text import slugify

import mimetypes
import zipfile
import os
import sqlite3
from io import BytesIO
import json
from urllib.parse import unquote
import tempfile

import logging
logger = logging.getLogger('django')

import re



from helpers.base.utils import get_response_file

def sanitize_filename(filename):
    return re.sub(r'[<>:"/\\|?*]', '_', filename)

def extract_zip(zip_file, base_path=""):
    files = {}
    
    with zipfile.ZipFile(zip_file, 'r') as zf:
        for filename in zf.namelist():
            if filename.endswith('/'):
                continue

            full_path = os.path.join(base_path, filename).replace('\\', '/')
            with zf.open(filename) as f:
                file = BytesIO(f.read())
                if is_zipped_file(filename=filename):
                    files.update(extract_zip(file, full_path))
                elif is_sqlite_file(filename=filename):
                    tables = get_sqlite_tables(file)
                    for table_name in tables:
                        files[f'{unquote(full_path)}/{table_name}'] = file
                else:
                    files[unquote(full_path)] = file
    
    return files

def is_zipped_file(filename:str=None, file_details:dict=None):
    if not filename:
        filename = ''

    if not file_details:
        file_details = {}

    ext = ['zip', 'kmz', 'bin']

    return any([
        i in file_details.get('content_type', '') 
        for i in ext
    ]) or any([
        filename.endswith(f'.{i}') for i in ext
    ])

def is_sqlite_file(filename:str=None, file_details:dict=None):
    if not filename:
        filename = ''

    if not file_details:
        file_details = {}

    ext = ['gpkg', 'sqlite']

    return any([
        i in file_details.get('content_type', '') 
        for i in ext
    ]) or any([
        filename.endswith(f'.{i}') for i in ext
    ])

def is_default_sqlite_table(name):
    SQLITE_DEFAULT_TABLES = [
        'spatial_ref_sys', 
        'spatialite_history', 
        'sqlite_sequence', 
        'geometry_columns', 
        'spatial_ref_sys_aux', 
        'views_geometry_columns', 
        'virts_geometry_columns', 
        'geometry_columns_statistics', 
        'views_geometry_columns_statistics', 
        'virts_geometry_columns_statistics', 
        'geometry_columns_field_infos', 
        'views_geometry_columns_field_infos', 
        'virts_geometry_columns_field_infos', 
        'geometry_columns_time', 
        'geometry_columns_auth', 
        'views_geometry_columns_auth', 
        'virts_geometry_columns_auth', 
        'data_licenses', 
        'sql_statements_log', 
        'SpatialIndex', 
        'ElementaryGeometries', 
        'KNN2', 
        ['idx_','_GEOMETRY'], 
        ['idx_','_GEOMETRY_rowid'], 
        ['idx_','_GEOMETRY_node'], 
        ['idx_','_GEOMETRY_parent'],
        'gpkg_spatial_ref_sys', 
        'gpkg_contents', 
        'gpkg_ogr_contents', 
        'gpkg_geometry_columns', 
        'gpkg_tile_matrix_set', 'gpkg_tile_matrix', 
        'gpkg_extensions', 
        'gpkg_metadata',
        'gpkg_metadata_reference',
        ['rtree_','_geom'], 
        ['rtree_','_geom_rowid'], 
        ['rtree_','_geom_node'], 
        ['rtree_','_geom_parent'],
    ]
    
    for i in SQLITE_DEFAULT_TABLES:
        if type(i) == str and name == i:
            return True
        
        if type(i) == list and name.startswith(i[0]) and name.endswith(i[1]):
            return True
        
    return False

def get_sqlite_tables(file):
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file.getvalue())
            tmp_path = tmp.name
        conn = sqlite3.connect(tmp_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        return [row[0] for row in cursor.fetchall() if not is_default_sqlite_table(row[0])]
    except Exception as e:
        logger.error(f'get_sqlite_tables, {e}')
        return []

def get_file_names(url):
    try:
        file_details = get_response_file(url)
        if not file_details:
            raise Exception('Failed to download file.')
        file = file_details.get('file')
        filename = file_details.get('filename','')
        if is_zipped_file(filename=filename, file_details=file_details):
            files = extract_zip(file, filename)
            return files.keys()
        if is_sqlite_file(filename=filename, file_details=file_details):
            tables = get_sqlite_tables(file)
            return [f'{filename}/{i}' for i in tables]
        return [filename]
    except Exception as e:
        logger.error(f'get_file_names, {e}')
        return []