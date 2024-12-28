from django.contrib import admin

from . import models



admin.site.register(models.Dataset)
admin.site.register(models.URL)
admin.site.register(models.Tag)
admin.site.register(models.ContentTag)

class MetaAbstractAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
        'type',
        'dataset',
        'map',
        'added_by',
        'updated_by',
        'tags',
        'added_on',
        'updated_on',
    )
    search_fields = ['title', 'tags__tag']
    list_filter = ['type']

admin.site.register(models.Content, MetaAbstractAdmin)