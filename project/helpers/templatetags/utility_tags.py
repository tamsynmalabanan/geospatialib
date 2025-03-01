from django import template

register = template.Library()

@register.simple_tag
def variable(value):
    return value