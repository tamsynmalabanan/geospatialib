from django.contrib import messages
from django.shortcuts import render, redirect, HttpResponse

def index(request):
    messages.success(request, 'Message test', extra_tags='main-index-map')
    context = {}
    return render(request, 'main/index.html', context)