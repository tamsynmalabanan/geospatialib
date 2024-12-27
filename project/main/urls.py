from django.urls import path, re_path
from .views import *

app_name = 'main'

urlpatterns = [
    path('', index, name='index'),
    path('test_htmx/', test_htmx, name='test_htmx'),
]