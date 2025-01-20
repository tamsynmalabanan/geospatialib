from django.contrib import admin

from . import models

admin.site.register(models.URL)
admin.site.register(models.Tag)

class MetaDatasetAdmin(admin.ModelAdmin):
    readonly_fields = (
        'id',
    )
    search_fields = ['title', 'tags__tag', 'name']
    list_filter = ['format']
    list_per_page = 15

admin.site.register(models.Dataset, MetaDatasetAdmin)