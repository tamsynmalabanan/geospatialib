from django.utils.text import slugify
from django.core.cache import cache

import string
import random
from collections import OrderedDict
import requests
import mimetypes
import io
import requests
import re
from urllib.parse import urlparse, urlunparse, unquote
import uuid
import os

import logging
logger = logging.getLogger('django')

DEFAULT_REQUEST_HEADERS = {'User-Agent': 'Geospatialib/1.0 (tamsyn.malabanan@gmail.com)'}

def get_special_characters(value):
    scs = (list(string.punctuation) + [' '])
    return list(set(char for char in value if char in scs))

def split_by_special_characters(value, excluded_chars=[]):
    special_chars = [sc for sc in get_special_characters(value) if sc not in excluded_chars]
    if len(special_chars) == 0: 
        return [value]
    
    delimiter = random.choice(special_chars)
    for sc in special_chars:
        if (sc == delimiter):
            continue
        value = value.replace(sc, delimiter)

    return [i for i in value.split(delimiter) if i != '']

def get_first_substring_match(value, choices={}, case_sensitive=False):
    if '' in choices:
        del choices['']

    if not case_sensitive: 
        value = value.lower()
        for key, keywords in choices.items():
            choices[key] = list(set([i.lower() for i in keywords]))

    current_key = None
    current_len = 0
    for key in choices.keys():
        key_input = key if case_sensitive else key.lower()
        if key_input in value:
            return key
        else:
            sections = split_by_special_characters(key_input)
            match_len = len([i for i in sections if i in value])
            if match_len > current_len:
                current_len = match_len
                current_key = key

    if not current_key:
        current_per = 0
        for key, keywords in choices.items():
            if len(keywords) > 0:
                matches = [i for i in keywords if i in value]
                per = len(matches) / len(keywords)
                if per == 1.0   :
                    return key
                if per > current_per:
                    current_per = per
                    current_key = key

    return current_key

def create_cache_key(values):
    return ';'.join([str(i) for i in values])

def dict_to_choices(dict, blank_choice=None, sort=False):
    dict_copy = {'':str(blank_choice)} if blank_choice is not None else {}

    for key, value in dict.items():
        try:
            dict_copy[key] = str(value)
        except Exception as e:
            logger.error(f'dict_to_choices, {e}')

    if sort:
        dict_copy = OrderedDict(sorted(dict_copy.items(), key=lambda item: item[1]))
    
    return [(key, value) for key, value in dict_copy.items()]

def get_response(
    url, 
    method='get', 
    with_default_headers=False, 
    raise_for_status=True, 
    data=None, 
    cache_response=True
):
    response = None

    if cache_response:
        response = cache.get(create_cache_key(['get_response', url, method]))
        if not response and method == 'head':
            response = cache.get(
                create_cache_key(['get_response', url, 'get']), 
                cache.get(create_cache_key(['get_response', url, 'post']))
            )

    if not response:
        try:
            headers = DEFAULT_REQUEST_HEADERS if with_default_headers else None

            if method == 'head' and not headers:
                response = requests.head(url)

            if method in ['head', 'get']:
                method = 'get'
                response = requests.get(url, headers=headers)
            
            if method == 'post':
                if data is None:
                    data = {}
                response = requests.post(url, data=data, headers=headers)

            if response.status_code == 403 and not headers:
                response = get_response(
                    url, 
                    method=method, 
                    with_default_headers=True, 
                    raise_for_status=raise_for_status, 
                    data=data
                )
            
            if raise_for_status:
                response.raise_for_status()
            
            if response.status_code != 404 and cache_response:
                cache.set(create_cache_key(['get_response', url, method]), response, 60*10)
        except Exception as e:
            logger.error(f'get_response, {e}')
    
    return response

def get_filename_from_response(response, alt):
    content_disposition = response.headers.get('content-disposition', '')
    if content_disposition:
        match = re.search(r'filename="?([^"]+)"?', content_disposition)
        if match:
            return match.group(1)
    return alt
    
def get_response_file(url):
    try:
        response = get_response(url, raise_for_status=True)
        content_type = response.headers.get('Content-Type', '')

        filename = get_filename_from_response(response, os.path.normpath(url).split(os.sep)[-1])
        if len(filename.split('.')) == 1:
            extension = mimetypes.guess_extension(content_type)
            if extension and extension != '.zip':
                filename += extension

        return {
            'file': io.BytesIO(response.content),
            'content_type': content_type,
            'filename': filename
        }
    except Exception as e:
        logger.error(f'get_response_file, {e}')
    return None
    
def get_decoded_response(response):
    try:
        return response.content.decode('utf-8')
    except Exception as e:
        return None

def replace_url_placeholders(url, values={}):
    placeholders = re.findall(r'\{(.*?)\}', url)
    for placeholder in placeholders:
        url = url.replace(f'{{{placeholder}}}', values.get(placeholder, '0'))
    return url

def remove_query_params(url):
    try:
        parsed_url = urlparse(url)
        cleaned_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path, '', '', ''))
        return cleaned_url
    except Exception as e:
        print(e)

def get_domain(url):
    return urlparse(url).netloc

def is_number(s):
    try:
        return float(s)
    except ValueError:
        return False

def is_ip_address(domain):
    parts = domain.split('.')
    return len(parts) == 4 and all([is_number(i) for i in parts]) and all([len(i) == 2 for i in parts[:-1]]) and len(parts[-1]) == 3

def get_domain_url(url):
    domain = get_domain(url)
    if is_ip_address(domain):
        return f'http://{domain}'
    return f'https://www.{".".join(domain.split(".")[-2:])}'

def get_domain_name(url):
    domain = get_domain(url)
    domain_parts = domain.split('.')
    if len(domain_parts) == 1:
        return domain
    if len(domain_parts) == 2:
        return domain_parts[0]
    if len(domain_parts) > 2:
        return domain_parts[-2]
    
def find_nearest_divisible(num, divisors):
    if num != 0:
        while True: 
            if all([num % i == 0 for i in divisors]): 
                break
            else:
                num += 1
    return num

def get_keywords_from_url(url):
    return [
        i for i in split_by_special_characters(unquote(url)) 
        if i not in ['http', 'https', 'www', 'com']
    ]

def generate_uuid():
    return uuid.uuid4().hex

def get_google_drive_file_download_url(url):
    download_pattern = r"^https://drive\.google\.com/uc\?export=download&id=([a-zA-Z0-9_-]+)$"
    if re.match(download_pattern, url):
        return url

    view_pattern = r"^https://drive\.google\.com/file/d/([a-zA-Z0-9_-]+)/view(?:\?.*)?$"
    view_match = re.match(view_pattern, url)
    if view_match:
        file_id = view_match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    return None
