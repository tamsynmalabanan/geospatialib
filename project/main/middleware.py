from django.http import HttpResponseForbidden
import re

class BlockScannerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_exact_paths = ['/version', '/.env', '/.env.save', '.gitignore']
        self.blocked_extensions = re.compile(r'\.(txt|php|env)$', re.IGNORECASE)

    def __call__(self, request):
        path = request.path

        if path in self.blocked_exact_paths:
            return HttpResponseForbidden("Forbidden")

        if self.blocked_extensions.search(path):
            return HttpResponseForbidden("Forbidden")

        return self.get_response(request)
    
class BlockSuspiciousHostMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_host_patterns = [
            re.compile(r'\.fqtgsjbemlvhaxkxwtkbirdaxsmbov\.org$', re.IGNORECASE),
            re.compile(r'\.onion$', re.IGNORECASE),
            re.compile(r'\.internal$', re.IGNORECASE),
        ]

    def __call__(self, request):
        host = request.get_host().split(':')[0]

        for pattern in self.blocked_host_patterns:
            if pattern.search(host):
                return HttpResponseForbidden("Forbidden: Suspicious Host")

        return self.get_response(request)