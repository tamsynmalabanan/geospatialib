"""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from apps.main.views import redirect_to_index

from decouple import config


urlpatterns = [
    path(f'{config('ADMIN_PATH')}/', admin.site.urls, name='admin'),

    # social auth paths
    path('accounts/', include('allauth.urls')),

    # apps
    path(f'{config('HTMX_PATH')}/', include('apps.htmx.urls')),
    path(f'{config('CUSTOMUSER_PATH')}/', include('apps.customuser.urls')),
    
    path('', include('apps.main.urls')),
    re_path(r'^.*$', redirect_to_index, name='redirect_to_index'),
]

handler404 = 'apps.main.views.redirect_to_index'