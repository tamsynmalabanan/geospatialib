from django.contrib import admin

from . import models

class BaseAdmin(admin.ModelAdmin):
    list_per_page = 100

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in models.BaseModel._meta.fields]

admin.site.register(models.Project, BaseAdmin)
admin.site.register(models.Role, BaseAdmin)
admin.site.register(models.Invite, BaseAdmin)
