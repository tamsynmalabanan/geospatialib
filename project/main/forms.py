from django import forms
from django.urls import reverse_lazy
from django.core.cache import cache

from . import choices
from helpers.general.utils import dict_to_choices

class ValidateCollectionForm(forms.Form):
    url = forms.URLField(
        label='URL',
        required=False,
        widget=forms.URLInput(attrs={
            'type':'search',
            'hx-post':reverse_lazy('htmx:validate_collection'),
            'hx-trigger':'change',
            'hx-target':'#addLayersForm-urlFields',
            'hx-swap': 'outerHTML',
        })
    )

    format = forms.ChoiceField(
        label='Format', 
        choices=dict_to_choices(choices.COLLECTION_FORMATS, blank_choice='Select format'), 
        required=False,
        error_messages={
            'required': 'Select a format.',
        },
        widget=forms.Select(attrs={
            'hx-post':reverse_lazy('htmx:validate_collection'),
            'hx-trigger':'change',
            'hx-target':'#addLayersForm-urlFields',
            'hx-swap': 'outerHTML',
            'disabled': True
        })
    )