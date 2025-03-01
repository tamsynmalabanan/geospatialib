from django import template

import string, random

register = template.Library()

@register.simple_tag
def variable(value):
    return value

@register.simple_tag
def random_string():
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=16))
