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

@register.simple_tag
def get_class_name(form):
    return form.__class__.__name__

@register.simple_tag
def get_field_id(field):
    return f'{field.form.__class__.__name__}_{field.name}'

@register.filter
def endswith(value, suffix):
    return str(value).endswith(suffix)