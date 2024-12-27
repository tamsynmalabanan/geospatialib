from django.shortcuts import render, HttpResponse

def test_htmx(request):
    return HttpResponse('test htmx')