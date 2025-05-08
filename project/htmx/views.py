from django.views.decorators.http import require_http_methods
from django.shortcuts import render, HttpResponse, get_object_or_404
from django.http import JsonResponse

import json
import requests

from main.models import SpatialRefSys

@require_http_methods(['POST'])
def add_layers(request):
    print(request.POST)
    # user = request.user
    # dataset_instance = None
    
    # form = lib_forms.AddDatasetForm(data={})
    
    # data = request.POST.dict()
    # url_value = data.get('url', '')
    # if url_value.strip() != '':
    #     url_field = form['url']
    #     form.data.update({'url':url_value})
    #     clean_url = form_helpers.validate_field(url_field)
    #     if clean_url:
    #         format_field = form['format']
    #         format_field.field.widget.attrs['disabled'] = False

    #         format_value = data.get('format', '')
    #         if format_value == '':
    #             format_value = dataset_helpers.get_dataset_format(url_value)
    #         if format_value:
    #             form.data.update({'format': format_value})
    #             form.full_clean()
            
    #         clean_format = form_helpers.validate_field(format_field)
    #         if clean_format:
    #             name_field = form['name']
    #             name_field.field.widget.attrs['disabled'] = False
    #             name_field.field.widget.attrs['autofocus'] = True

    #             layers = [layer[0] for layer in name_field.field.choices]
    #             name_value = data.get('name', '')
    #             if name_value == '' or name_value not in layers:
    #                 name_value = util_helpers.get_first_substring_match(url_value, layers)
    #             if not name_value:
    #                 name_value = layers[0]
    #             form.data.update({'name': name_value})
    #             form.full_clean()

    #     message_template = 'library/add_dataset/message.html'
    #     message_tags = 'add-dataset-form message-template'

    #     dataset_handler = cache.get(form.cached_handler_key)
    #     url_instance = None

    #     form_is_valid = form.is_valid()
    #     clean_data = form.cleaned_data
        
    #     if form_is_valid and dataset_handler:
    #         url_instance, created = lib_models.URL.objects.get_or_create(
    #             url=dataset_handler.access_url,
    #         )
    #         if url_instance:
    #             dataset_queryset = lib_models.Dataset.objects.filter(
    #                 url=url_instance,
    #                 format=clean_data['format'],
    #                 name=clean_data['name'],
    #             )
    #             if dataset_queryset.exists():
    #                 dataset_instance = dataset_queryset.first()
    #                 messages.info(request, message_template, message_tags)

    #     if data.get('submit') is not None and not dataset_instance:
    #         if form_is_valid and url_instance:
    #             dataset_instance, created = lib_models.Dataset.objects.get_or_create(
    #                 url=url_instance,
    #                 format=clean_data['format'],
    #                 name=clean_data['name'],
    #             )
    #             if dataset_instance:
    #                 if created:
    #                     dataset_handler.populate_dataset(dataset_instance)
    #                     messages.success(request, message_template, message_tags)
    #                 else:
    #                     messages.info(request, message_template, message_tags)
    #         else:
    #             messages.error(request, message_template, message_tags)

    # return render(request, 'library/add_dataset/form.html', {
    #     'form':form, 
    #     'dataset':dataset_instance,
    # })

    return HttpResponse('test')


@require_http_methods(['POST', 'GET'])
def cors_proxy(request):
    url = request.GET.get('url')
    if not url:
        return JsonResponse({'error': 'URL parameter is required'}, status=400)
    
    try:
        data = {}
        if request.method == 'POST':
            data = json.loads(request.body.decode('utf-8'))
        method = str(data.get('method', 'get')).lower()
        headers = data.get('headers', {})
        
        if method == 'get':
           response = requests.get(url, headers=headers)
        elif method == 'post':
            response = requests.post(url, json=data, headers=headers)
        else:
            return JsonResponse({'error': f'Unsupported method: {method}'}, status=400)
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        return JsonResponse({'error': f'Error during request: {str(e)}'}, status=500)

    content_type = response.headers.get('Content-Type')
    return HttpResponse(response.content, content_type=content_type, status=response.status_code)



def srs_wkt(request, srid):
    srs = get_object_or_404(SpatialRefSys, srid=srid)
    return HttpResponse(srs.srtext, content_type='text/plain')