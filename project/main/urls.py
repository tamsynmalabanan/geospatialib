from django.contrib.auth.views import LogoutView
from django.urls import path, re_path
from . import views

app_name = 'main'

urlpatterns = [
        path('', views.index, name='index'),
        re_path(r'^.*$', views.redirect_to_index, name='redirect_to_index'),
]
