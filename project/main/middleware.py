from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings

class DeviceIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        device_id = request.COOKIES.get('device_id')
        

        response = self.get_response(request)
        return response