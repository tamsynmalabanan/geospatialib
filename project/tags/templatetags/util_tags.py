from django import template

import random, string

register = template.Library()

@register.simple_tag
def random_string():
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=16))

@register.simple_tag
def var(value):
    return value
