from django import template

import string, random

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value else sub

@register.simple_tag
def random_string():
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=16))

# @register.simple_tag
# def get_theme(request):
#     return request.COOKIES.get('theme', 'light')