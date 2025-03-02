from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

def index(request):
    context = {}
    return render(request, 'main/index.html', context)

def test(request):
    user_agent = request.META.get('HTTP_USER_AGENT', 'unknown')
    return HttpResponse(f'Your User-Agent is: {user_agent}')