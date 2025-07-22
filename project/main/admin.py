from django.contrib import admin

from . import models

admin.site.register(models.SpatialRefSys)
admin.site.register(models.URL)

class CollectionAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
        'last_update',
    )
    list_per_page = 15
    list_filter = ['format']

admin.site.register(models.Collection, CollectionAdmin)

class LayerAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
        'search_vector'
    )
    search_fields = ['name', 'title', 'abstract', 'attribution', 'fees']
    list_filter = ['type']
    list_per_page = 15

admin.site.register(models.Layer, LayerAdmin)