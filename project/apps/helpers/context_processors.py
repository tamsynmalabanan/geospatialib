from .forms import CollectionForm

def forms(request):
    if not request.htmx:
        return {
            'collection_form': CollectionForm(),
        }
    
    return {}