from django.contrib.auth.views import LogoutView
from django.urls import path, re_path
from . import views

app_name = 'htmx'

urlpatterns = [
        path('UTwdESEdVxpXhVSC/', views.get_collection_datasets, name='get_collection_datasets'),
]
