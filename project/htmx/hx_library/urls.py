from django.contrib.auth.views import LogoutView
from django.urls import path, re_path

from . import views

app_name = 'hx_library'

urlpatterns = [
    path('search/', views.SearchList.as_view(), name='search'),
    path('add_dataset/', views.add_dataset, name='add_dataset'),
    path('cors_proxy/', views.cors_proxy, name='cors_proxy'),
]