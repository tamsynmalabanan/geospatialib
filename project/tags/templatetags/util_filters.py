from django import template

register = template.Library()

@register.filter
def object_type(value):
    return str(type(value))

@register.filter
def vars_dict(value):
    return vars(value)