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
from urllib.parse import urlparse, urlunparse

DEFAULT_REQUEST_HEADERS = {'User-Agent': 'Mozilla/5.0'}

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
            print('ERROR with dict_to_choices: ', e)

    if sort:
        dict_copy = OrderedDict(sorted(dict_copy.items(), key=lambda item: item[1]))
    
    return [(key, value) for key, value in dict_copy.items()]

def get_response(url, header_only=False, with_default_headers=False, raise_for_status=True):
    cacheKey = create_cache_key(['get_response', url, header_only])
    response = cache.get(cacheKey)

    if not response and header_only:
        cacheKey = create_cache_key(['get_response', url, False])
        response = cache.get(cacheKey)

    if not response:
        try:
            if header_only and not with_default_headers:
                response = requests.head(url)
            else:
                response = requests.get(url, headers=DEFAULT_REQUEST_HEADERS if with_default_headers else {})
            
            if response.status_code == 403 and not with_default_headers:
                response = get_response(url, with_default_headers=True, raise_for_status=raise_for_status)
            
            if raise_for_status:
                response.raise_for_status()
            
            if response.status_code != 404:
                cache.set(cacheKey, response, 60*60)
        except Exception as e:
            print('get_response', e)
    
    return response
    
def get_response_file(url):
    try:
        response = get_response(url, raise_for_status=True)
        content_type = response.headers.get('Content-Type', '')
        extension = mimetypes.guess_extension(content_type)
        filename = url.split("/")[-1]
        if extension and not filename.endswith(extension):
            filename += extension
        return {
            'file': io.BytesIO(response.content), 
            'content_type': content_type,
            'filename': filename
        }
    except Exception as e:
        print(e)
    return None
    
def get_decoded_response(response):
    try:
        return response.content.decode('utf-8')
    except Exception as e:
        print('get_decoded_response',e)

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
    return f'https://www.{'.'.join(domain.split('.')[-2:])}'

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