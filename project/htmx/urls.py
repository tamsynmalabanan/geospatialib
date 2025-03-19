from django.urls import path, re_path

from . import views

app_name = 'htmx'

urlpatterns = [
    path('cors_proxy/', views.cors_proxy, name='cors_proxy'),
    path('srs_wkt/<srid:int>/', views.srs_wkt, name='srs_wkt'),
]