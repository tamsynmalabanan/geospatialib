from django.urls import path, re_path

from . import views

app_name = 'htmx'

urlpatterns = [
    path('cors_proxy/', views.cors_proxy, name='cors_proxy'),
    path('validate_collection/', views.validate_collection, name='validate_collection'),
    path('srs_wkt/<int:srid>/', views.srs_wkt, name='srs_wkt'),
]