from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404

from apps.helpers.forms import CollectionForm

@require_http_methods(['POST'])
def get_collection_datasets(request):
    data = request.POST.dict()
    form = CollectionForm(data)
    
    # if form.is_valid():
    #     context = get_collection_data(
    #         url = form.cleaned_data.get('url', ''),
    #         format = form.cleaned_data.get('format', None),
    #     ) or {}
    #     layers = context.get('layers', {})
    #     if layers == {}:
    #         raw_format = data.get('format')
    #         form.data.update({'format':raw_format})
    #         if raw_format:
    #             form.add_error('format', 'No layers retrieved in selected format.')
    #     else:
    #         form.data.update({
    #             'url':context['url'],
    #             'format':context['format'],
    #         })
    #         context['layers'] = sort_layers(layers)

    return render(request, 'helpers/partials/url_fields.html', {
        'form': form
    })
