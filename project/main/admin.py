from django.contrib import admin

from . import models, choices

from urllib.parse import urlparse

class TaginfoKeyAdmin(admin.ModelAdmin):
    list_per_page = 20
    search_fields = ['key']
    list_display = ['key', 'count_all', 'values_all']
    readonly_fields = ['key', 'count_all', 'values_all']

class CollectionAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_filter = ['format']
    list_display = ['__str__', 'layer_count']
    readonly_fields = ('id', 'last_update', 'layer_count')

    def layer_count(self, obj):
        return obj.layers.count()
    layer_count.short_description = "No. of Layers"

class LayerAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_filter = ['type']
    list_display  = ['collection', 'name', 'title', 'type']
    search_fields = ['name', 'title', 'abstract', 'attribution', 'fees', 'tags']
    readonly_fields = ('id', 'search_vector', 'last_update', 'url', 'format', 'bbox_extent')

    def url(self, obj):
        return obj.collection.url.path
    url.short_description = "URL"

    def format(self, obj):
        return obj.collection.format
    format.short_description = "Format"

    def bbox_extent(self, obj):
        return obj.bbox.extent
    bbox_extent.short_description = "BBOX Extent"

admin.site.register(models.SpatialRefSys)
admin.site.register(models.SpatialRefSysExt)
admin.site.register(models.URL)
admin.site.register(models.Collection, CollectionAdmin)
admin.site.register(models.Layer, LayerAdmin)