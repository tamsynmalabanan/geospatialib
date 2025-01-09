from . import util_helpers
from apps.library import models as lib_models
from django.db.models import Q

def collect_url_tags(url):
    tag_instances = []

    tags = util_helpers.split_by_special_characters(url, ['_', '-'])
    for tag in [tag for tag in tags if len(tag) > 3 and 'http' not in tag]:
        tag_instance, created = lib_models.Tag.objects.get_or_create(tag=tag.lower())
        if tag_instance:
            tag_instances.append(tag_instance)
    
    return tag_instances

def list_to_tags(tags_list):
    tag_instances = []

    for value in tags_list:
        tags = util_helpers.split_by_special_characters(value, ['_', '-'])
        for tag in tags:
            try:
                tag_instance, created = lib_models.Tag.objects.get_or_create(tag=tag.lower())
                if tag_instance:
                    tag_instances.append(tag_instance)
            except Exception as e:
                pass
    return tag_instances
    

def get_field_from_instance(instance, field_exp):
    field_names = field_exp.split('__')
    model_class = instance.__class__

    index = 0
    while index != len(field_names):
        field_name = field_names[index]
        field = model_class._meta.get_field(field_name)
        if field.is_relation:
            model_class = field.related_model
        index +=1

    return field