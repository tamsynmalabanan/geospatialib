from django.shortcuts import redirect, render
from django.urls import resolve
from django.conf import settings
# from django.http import HttpResponseForbidden

class HTMXDomainRestriction:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        exceptions = ['find_layers']
        app = resolve(request.path)
        if not settings.DEBUG and app.app_name == 'htmx' and app.url_name not in exceptions:
            not_htmx_request = not request.htmx
            not_allowed_host = not any([i for i in settings.ALLOWED_HOSTS if i in request.META.get('HTTP_HOST')])
            if not_htmx_request or not_allowed_host:
                return redirect('main:index')
                # return HttpResponseForbidden('You do not have permission to access this resource.')

        response = self.get_response(request)
        return response