from django.urls import path, re_path

from . import views

app_name = 'htmx'

urlpatterns = [
    path('cors_proxy/', views.cors_proxy, name='cors_proxy'),
    path('add_layers/', views.add_layers, name='add_layers'),
    path('srs_wkt/<int:srid>/', views.srs_wkt, name='srs_wkt'),
]