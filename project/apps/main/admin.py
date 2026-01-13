from django.contrib import admin

from . import models

class UserAdmin(admin.ModelAdmin):
    list_per_page = 100
    list_filter = [
        'is_active',
        'is_staff',
        'is_superuser',
        'is_premium',
    ]
    list_display  = [
        'email',
        'username',
        'first_name',
        'last_name',
    ]
    search_fields  = [
        'email',
        'username',
        'first_name',
        'last_name',
    ]
    readonly_fields  = [
        'join_date',
        'email',
        'username',
        'first_name',
        'last_name',
        'password',
        'last_login',
    ]

admin.site.register(models.User, UserAdmin)

class BaseAdmin(admin.ModelAdmin):
    list_per_page = 100

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in models.BaseModel._meta.fields]

admin.site.register(models.Project, BaseAdmin)
admin.site.register(models.Role, BaseAdmin)
