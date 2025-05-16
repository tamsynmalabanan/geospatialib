from django import template

import string
import random

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value is not None else sub

@register.filter
def equals(value1, value2):
    return None if value1 in [None, ''] else value1 == value2

@register.filter
def get(dict, key, sub=None):
    return dict.get(key, sub)


@register.simple_tag
def random_string():
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=16))