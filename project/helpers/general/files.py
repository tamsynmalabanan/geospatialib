from django.utils.text import slugify

import requests
import mimetypes
import zipfile
import os
from io import BytesIO

def extract_zip(zip_file, base_path=""):
    files = {}
    with zipfile.ZipFile(zip_file, 'r') as zf:
        for file in zf.namelist():
            full_path = os.path.join(base_path, file)
            if file.endswith('.zip'):
                with zf.open(file) as sub_zip:
                    files.update(extract_zip(BytesIO(sub_zip.read()), full_path))
            else:
                files[full_path] = file
    return files

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
        return extract_zip(BytesIO(response.content))
    
    return {slugify(filename): filename}
