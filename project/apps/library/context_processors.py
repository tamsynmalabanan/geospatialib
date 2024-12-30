from django.contrib import messages

from apps.library import forms as lib_forms
from htmx.hx_library import views

def forms(request):
    if not request.htmx:
        return {
            'share_dataset_form': lib_forms.ShareDatasetForm(),
        }
    
    return {}