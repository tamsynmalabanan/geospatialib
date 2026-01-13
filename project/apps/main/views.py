from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout

def index(request):
    return render(request, 'main/index.html')

def redirect_to_index(request, exception=None):
    return redirect('/')

@login_required
@require_http_methods(['POST'])
def delete_account(request):
    user = request.user
    logout(request)
    if not user.is_superuser:
        user.delete()
    return redirect('main:index')