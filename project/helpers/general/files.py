from django.utils.text import slugify

import requests
import mimetypes
import zipfile
import os
from io import BytesIO

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
        response = requests.get(url)
        if 200 <= response.status_code < 400:
            raise Exception("Failed to download file.")

        content_type = response.headers.get('Content-Type', '')
        extension = mimetypes.guess_extension(content_type)

        filename = url.split("/")[-1]
        if extension and not filename.endswith(extension):
            filename += extension

        if "zip" in content_type:
            return extract_zip(BytesIO(response.content), filename)
        
        return [filename]
    except Exception as e:
        return []
    
def get_file_raw_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as error:
        raise error
    

