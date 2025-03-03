from django import template

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value else sub

@register.filter
def equals(value1, value2):
    return value1 === value2