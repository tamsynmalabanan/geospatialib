from django import template

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value is not None else sub

@register.filter
def equals(value1, value2):
    return None if value1 is None else value1 == value2