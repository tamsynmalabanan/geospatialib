from django.contrib import admin

from . import models, choices

from urllib.parse import urlparse

admin.site.register(models.SpatialRefSys)
admin.site.register(models.URL)

class CollectionAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_filter = ['format']
    list_display = ['collection_name', 'layer_count']
    readonly_fields = ('id', 'last_update', 'layer_count')

    def collection_name(self, obj):
        return obj.__str__()
    collection_name.short_description = "Collection"

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
    list_per_page = 20
    list_display  = ['name', 'title']

admin.site.register(models.Layer, LayerAdmin)