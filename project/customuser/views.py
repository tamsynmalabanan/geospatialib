from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout
from django.shortcuts import render, HttpResponse, redirect
from django.urls import reverse_lazy, reverse
from django.contrib import messages

@login_required
@require_http_methods(['POST'])
def delete_account(request):
    user = request.user
    logout(request)
    user.delete()
    messages.info(request, 'Account deleted.', extra_tags='main-index-map')
    return redirect('main:index')