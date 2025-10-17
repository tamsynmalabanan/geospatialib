from django.contrib.auth.views import LogoutView
from django.urls import path, re_path
from . import views

app_name = 'main'

urlpatterns = [
        path('', views.index, name='index'),
        path('thumbnail/<int:pk>/', views.layer_thumbnail, name='thumbnail'),
]
