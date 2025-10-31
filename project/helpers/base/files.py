from django.utils.text import slugify

import mimetypes
import zipfile
import os
from io import BytesIO
import json
from urllib.parse import unquote

import logging
logger = logging.getLogger('django')

import re



from helpers.base.utils import get_response_file

ZIPPED_EXTENSIONS = ['zip', 'kmz', 'bin']

def sanitize_filename(filename):
    return re.sub(r'[<>:"/\\|?*]', '_', filename)

def extract_zip(zip_file, base_path=""):
    files = {}
    
    with zipfile.ZipFile(zip_file, 'r') as zf:
        for filename in zf.namelist():
            if filename.endswith('/'):
                continue

            full_path = os.path.join(base_path, filename)
            with zf.open(filename) as f:
                file = BytesIO(f.read())
                if is_zipped_file(filename=filename):
                    files.update(extract_zip(file, full_path))
                else:
                    files[unquote(full_path)] = file
    
    return files

def is_zipped_file(filename:str=None, file_details:dict=None):
    if not filename:
        filename = ''

    if not file_details:
        file_details = {}

    return any([
        i in file_details.get('content_type', '') 
        for i in ZIPPED_EXTENSIONS
    ]) or any([
        filename.endswith(f'.{i}') for i in ZIPPED_EXTENSIONS
    ])

def get_file_names(url):
    try:
        file_details = get_response_file(url)
        if not file_details:
            raise Exception('Failed to download file.')
        filename = file_details.get('filename','')
        if is_zipped_file(filename=filename, file_details=file_details):
            return extract_zip(file_details.get('file'), filename).keys()
        return [filename]
    except Exception as e:
        logger.error(f'get_file_names, {e}')
        return []