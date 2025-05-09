from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings

class HTMXDomainRestriction:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = resolve(request.path)
        if path.app_name == 'htmx':
            # if path.url_name != 'cors_proxy':
                not_htmx = not request.htmx
                not_allowed_host = request.META.get('HTTP_HOST') not in settings.ALLOWED_HOSTS
                if not_htmx or not_allowed_host:
                    return redirect('main:index')

        response = self.get_response(request)
        return response