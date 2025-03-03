from django import template

register = template.Library()

@register.simple_tag
def variable(value, sub=None):
    return value if value else sub