from django.urls import path, re_path

from . import views

app_name = 'htmx'

urlpatterns = [
    path('cors_proxy/', views.cors_proxy, name='cors_proxy'),
    path('collection/validate/', views.validate_collection, name='validate_collection'),
    path('collection/update/', views.update_collection, name='update_collection'),
    path('get_layer_forms/', views.get_layer_forms, name='get_layer_forms'),
    path('srs_wkt/<int:srid>/', views.srs_wkt, name='srs_wkt'),
]