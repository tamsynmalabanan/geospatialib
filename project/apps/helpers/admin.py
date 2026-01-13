from django.contrib import admin

from .models import SpatialRefSys, SpatialRefSysExt

class SpatialRefSysAdmin(admin.ModelAdmin):
    list_per_page = 100
    list_filter = ['auth_name']
    list_display  = ['title']
    search_fields = ['auth_name', 'auth_srid', 'srtext', 'proj4text']

    def title(self, obj):
        return obj.__str__()
    title.short_description = "Title"

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

admin.site.register(SpatialRefSys, SpatialRefSysAdmin)

class SpatialRefSysExtAdmin(admin.ModelAdmin):
    list_per_page = 100
    list_filter = [
        'source',
        'type',
        'unit',
    ]
    list_display  = ['name']
    search_fields = ['name', 'extent']

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields if f.name != 'bbox']

admin.site.register(SpatialRefSysExt, SpatialRefSysExtAdmin)