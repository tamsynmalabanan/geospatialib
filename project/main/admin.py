from django.contrib import admin

from . import models, choices

from urllib.parse import urlparse

admin.site.register(models.SpatialRefSys)
admin.site.register(models.URL)

class CollectionAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
        'last_update',
        'layer_count',
    )
    list_per_page = 15
    list_filter = ['format']
    list_display = ['url_domain', 'format_name', 'layer_count']

    def url_domain(self, obj):
        return urlparse(obj.url.path).netloc
    url_domain.short_description = "Source"

    def format_name(self, obj):
        return choices.COLLECTION_FORMATS.get(obj.format)
    format_name.short_description = "Format"

    def layer_count(self, obj):
        return obj.layers.count()
    layer_count.short_description = "No. of Layers"

admin.site.register(models.Collection, CollectionAdmin)

class LayerAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
        'search_vector'
    )
    search_fields = ['name', 'title', 'abstract', 'attribution', 'fees']
    list_filter = ['type']
    list_per_page = 15
    list_display  = ['name', 'title']

admin.site.register(models.Layer, LayerAdmin)