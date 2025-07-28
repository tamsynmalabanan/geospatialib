from django import template

import string
import random
from urllib.parse import urlencode, urlparse
import json

from helpers.base.utils import find_nearest_divisible

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value is not None else sub

@register.filter
def equals(value1, value2):
    return None if value1 in [None, ''] else value1 == value2

@register.filter
def format_number(value):
    return f"{value:,}"

@register.filter
def dump_json(value):
    return json.dumps(value)

@register.filter
def get(dict, key, sub=None):
    return dict.get(key, sub)

@register.filter
def field_name(exp):
    return exp.split('__')[-1]

@register.filter
def sub_bool(value, sub):
    if isinstance(value, bool):
        if value:
            return sub
        return f'not {sub}'
    return value

@register.simple_tag 
def querystring(request, **kwargs): 
    query = request.GET.copy() 
    for key, value in kwargs.items(): 
        query[key] = value 
    return f"?{urlencode(query)}"

@register.filter
def domain(url):
    return urlparse(url).netloc

@register.filter
def stringify(value):
    return str(value)

@register.filter
def format_number(number):
    return f'{number:,}'

@register.simple_tag
def random_string():
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=16))

@register.simple_tag
def get_class_name(form):
    return form.__class__.__name__

@register.simple_tag
def get_field_id(field):
    return f'{field.form.__class__.__name__}_{field.name}'

@register.filter
def endswith(value, suffix):
    return str(value).endswith(suffix)

@register.filter
def fillers_range(count):
    return range(find_nearest_divisible(count, [2,3,4,5])-count)