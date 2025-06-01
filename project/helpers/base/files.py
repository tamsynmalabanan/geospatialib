from django.utils.text import slugify

import mimetypes
import zipfile
import os
from io import BytesIO
import json

from helpers.base.utils import get_response_file

def extract_zip(zip_file, base_path=""):
    files = {}
    
    with zipfile.ZipFile(zip_file, 'r') as zf:
        for filename in zf.namelist():
            if filename.endswith('/'):
                continue

            full_path = os.path.join(base_path, filename)
            with zf.open(filename) as f:
                file = BytesIO(f.read())
                if filename.endswith('.zip'):
                    files.update(extract_zip(file, full_path))
                else:
                    files[full_path] = file
    
    return files

def get_file_names(url):
    try:
        file_details = get_response_file(url)
        if not file_details:
            raise Exception('Failed to download file.')
        filename = file_details.get('filename','')
        if "zip" in file_details.get('content_type', ''):
            return extract_zip(file_details.get('file'), filename).keys()
        return [filename]
    except Exception as e:
        print(e)
        return []