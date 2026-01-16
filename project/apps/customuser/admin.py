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

