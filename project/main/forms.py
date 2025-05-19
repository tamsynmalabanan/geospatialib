from django import forms
from django.urls import reverse_lazy
from django.core.cache import cache

import validators
from urllib.parse import unquote


from . import choices
from helpers.general.utils import dict_to_choices
from helpers.gis.layers import guess_format_from_url

class ValidateCollectionForm(forms.Form):
    url = forms.URLField(
        label='URL',
        required=True,
        widget=forms.URLInput(attrs={
            'type':'search',
            'class':'form-control',
            'hx-post':reverse_lazy('htmx:validate_collection'),
            'hx-trigger':'change',
            'hx-target':'#addLayersForm-urlFields',
            'hx-swap': 'innerHTML',
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
            'disabled': True,
            'class':'form-select',
            'hx-post':reverse_lazy('htmx:validate_collection'),
            'hx-trigger':'change',
            'hx-target':'#addLayersForm-urlFields',
            'hx-swap': 'innerHTML',
        })
    )

    def clean_url(self):
        url = self.cleaned_data.get("url")
        if not validators.url(url):
            raise forms.ValidationError("Invalid url.")
        return unquote(url)

    def clean_format(self):
        url = self.cleaned_data.get("url")
        format = self.cleaned_data.get("format")
        if url and not format:
            format = guess_format_from_url(url)
            if format: 
                self.data.update({'format':format})
        if format:
            attrs = self.fields['format'].widget.attrs
            if attrs.get('disabled'):
                del attrs['disabled']
        return format