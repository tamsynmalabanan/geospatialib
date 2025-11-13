from django.contrib.auth.views import LogoutView
from django.urls import path, re_path
from . import views

app_name = 'main'

urlpatterns = [
        path('', views.index, name='index'),
        path('maplibre/', views.index_maplibre, name='index_maplibre'),
        path('sql-wasm.wasm', views.serve_sql_wasm, name='serve_sql_wasm'),
]
