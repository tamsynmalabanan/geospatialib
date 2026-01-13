from django import template

import string
import random
from urllib.parse import urlencode, urlparse
import json

register = template.Library()

@register.simple_tag
def var(value, sub=None):
    return value if value is not None else sub

@register.simple_tag
def random_string(k=16):
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=k))