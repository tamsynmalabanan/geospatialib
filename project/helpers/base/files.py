from django.utils.text import slugify

import mimetypes
import zipfile
import os
from io import BytesIO

from helpers.base.utils import get_response, get_response_file

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
        file, content_type = get_response_file(url)
        if not file or not content_type:
            raise Exception('Failed to download file.')
            
        extension = mimetypes.guess_extension(content_type)
        filename = url.split("/")[-1]
        if extension and not filename.endswith(extension):
            filename += extension

        if "zip" in content_type:
            return extract_zip(file, filename).keys()
        
        return [filename]
    except Exception as e:
        print(e)
        return []
