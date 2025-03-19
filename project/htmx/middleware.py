from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings

class HTMXDomainRestriction:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if resolve(request.path).app_name == 'htmx':
            if not request.htmx or request.META.get('HTTP_HOST') not in settings.ALLOWED_HOSTS:
                return redirect('main:index')

        response = self.get_response(request)
        return response