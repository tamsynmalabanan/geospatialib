from django.http import HttpResponseForbidden

class BlockScannerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_paths = ['/version', '/.env', '/.env.save', '/robots.txt']

    def __call__(self, request):
        if request.path in self.blocked_paths:
            return HttpResponseForbidden("Forbidden")
        return self.get_response(request)