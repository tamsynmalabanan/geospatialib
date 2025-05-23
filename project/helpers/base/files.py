from django.utils.text import slugify

import mimetypes
import zipfile
import os
from io import BytesIO

from helpers.base.utils import get_response, get_response_file

def extract_zip(zip_file, base_path=""):
    files = []
    
    with zipfile.ZipFile(zip_file, 'r') as zf:
        for file in zf.namelist():
            if file.endswith('/'):
                continue

            full_path = os.path.join(base_path, file)
            if file.endswith('.zip'):
                with zf.open(file) as sub_zip:
                    files = files + extract_zip(BytesIO(sub_zip.read()), full_path)
            else:
                files.append(full_path)
    
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
            return extract_zip(file, filename)
        
        return [filename]
    except Exception as e:
        print(e)
        return []
