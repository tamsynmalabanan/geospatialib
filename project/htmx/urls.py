from django.urls import path, re_path

from . import views

app_name = 'htmx'

urlpatterns = [
    path('cors/proxy/', views.cors_proxy, name='cors_proxy'),
    # path('search/', views.SearchList.as_view(), name='search'),
    path('library/search/', views.search_library, name='search_library'),
    path('collection/validate/', views.validate_collection, name='validate_collection'),
    path('collection/update/', views.update_collection, name='update_collection'),
    path('forms/layers/', views.get_layer_forms, name='get_layer_forms'),
    path('srs/wkt/<int:srid>/', views.srs_wkt, name='srs_wkt'),
]