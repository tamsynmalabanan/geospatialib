from django.utils.text import slugify

import requests
import mimetypes
import os
import zipfile
from io import BytesIO

def get_file_info(url):
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception("Failed to download file.")

    content_type = response.headers.get('Content-Type', '')
    extension = mimetypes.guess_extension(content_type)

    filename = url.split("/")[-1]
    if extension:
        filename += extension

    if "zip" in content_type:
        files = {}
        with zipfile.ZipFile(BytesIO(response.content), 'r') as zf:
            for file in zf.namelist():
                files[slugify(file)] = file
        return files
    
    return {slugify(filename): filename}