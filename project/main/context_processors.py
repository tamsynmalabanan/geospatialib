from django.contrib import messages

from .forms import ValidateCollectionForm

def forms(request):
    if not request.htmx:
        return {
            'validate_collection_form': ValidateCollectionForm(),
        }
    
    return {}