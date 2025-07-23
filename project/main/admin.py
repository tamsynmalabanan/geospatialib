from django.contrib import admin

from . import models, choices

from urllib.parse import urlparse

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
    list_display  = ['name', 'title', 'type']
    search_fields = ['name', 'title', 'abstract', 'attribution', 'fees']
    # readonly_fields = ('id', 'search_vector', 'last_update', 'url', 'format')

    # def url(self, obj):
    #     return obj.collection.url.path
    # url.short_description = "URL"

    # def format(self, obj):
    #     return obj.collection.format
    # format.short_description = "Format"

admin.site.register(models.SpatialRefSys)
admin.site.register(models.URL)
admin.site.register(models.Collection, CollectionAdmin)
admin.site.register(models.Layer, LayerAdmin)