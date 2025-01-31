from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings

class HTMXDomainRestriction:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = resolve(request.path)
        if path.url_name != 'cors_proxy':
            if path.app_name.startswith('hx_') and not request.htmx:
                return redirect('library:index')
            
            if request.META.get('HTTP_HOST') not in settings.ALLOWED_HOSTS:
                return redirect('library:index')

        response = self.get_response(request)
        return response