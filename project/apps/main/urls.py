from django.contrib.auth.views import LogoutView
from django.urls import path, re_path
from . import views

app_name = 'main'

urlpatterns = [
        path("", views.index, name="index"),
        path("accounts/logout/", LogoutView.as_view(), name="logout_account"),
        path("accounts/delete/", views.delete_account, name="delete_account"),
]
