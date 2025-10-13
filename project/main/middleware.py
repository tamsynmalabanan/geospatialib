from django.http import HttpResponseForbidden
import re

class BlockScannerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_exact_paths = ['/version', '/.env', '/.env.save']
        self.blocked_extensions = re.compile(r'\.(txt|php)$', re.IGNORECASE)

    def __call__(self, request):
        path = request.path

        if path in self.blocked_exact_paths:
            return HttpResponseForbidden("Forbidden")

        if self.blocked_extensions.search(path):
            return HttpResponseForbidden("Forbidden")

        return self.get_response(request)