from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings

class HTMXDomainRestriction:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        app_name = resolve(request.path).app_name
        if app_name == 'htmx' and not request.htmx:
            return redirect('main:index')
        
        http_host = request.META.get('HTTP_HOST')
        if http_host not in settings.ALLOWED_HOSTS:
            return redirect('main:index')

        response = self.get_response(request)
        return response