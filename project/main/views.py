from django.shortcuts import render, redirect, HttpResponse

def index(request):
    context = {}
    return render(request, 'main/index.html', context)