from django.contrib.auth.views import LogoutView
from django.urls import path

from . import views

app_name = 'customuser'

urlpatterns = [
        path("logout/", LogoutView.as_view(), name="logout"),
        path("delete/", views.delete_account, name="delete_account"),
]