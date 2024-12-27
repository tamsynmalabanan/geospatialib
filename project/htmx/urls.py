from django.urls import path, re_path
from .views import *

app_name = 'htmx'

urlpatterns = [
    path('test_htmx/', test_htmx, name='test_htmx'),
]