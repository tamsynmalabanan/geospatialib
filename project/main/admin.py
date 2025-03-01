from django.contrib import admin

from . import models

admin.site.register(models.URL)
admin.site.register(models.Collection)

class LayerAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
    )
    search_fields = ['name']
    list_filter = ['collection']
    list_per_page = 15

admin.site.register(models.Layer, LayerAdmin)