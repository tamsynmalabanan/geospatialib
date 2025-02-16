from django import forms
from django.urls import reverse_lazy
from django.core.cache import cache

from . import choices
from utils.general import form_helpers, util_helpers
from utils.gis import dataset_helpers

class SearchForm(forms.Form):
    query = forms.CharField(
        label='Search...', 
        max_length=255, 
        required=True,
        widget=forms.TextInput(attrs={
            'type':'search',
            'class':'h-100 border-0 rounded-0 focus-underline-primary box-shadow-none ps-0',
            'title':'Type in * for wildcard search; prefix keywords with − to exclude them from search results.'
        })
    )

class AddDatasetForm(forms.Form):
    url = forms.URLField(
        label='URL',
        required=True,
        widget=forms.URLInput(attrs={
            'type':'search',
            'hx-post':reverse_lazy('hx_library:add_dataset'),
            'hx-trigger':'change',
            # 'hx-trigger':'input changed delay:1000ms',
            'hx-target':'#addDatasetFormFields',
            'hx-swap': 'innerHTML',
        })
    )
    format = forms.ChoiceField(
        label='Format', 
        choices=form_helpers.dict_to_choices(choices.DATASET_FORMATS, blank_choice=''), 
        required=True,
        error_messages={
            'required': 'Select a format.',
        },
        widget=forms.Select(attrs={
            'hx-post':reverse_lazy('hx_library:add_dataset'),
            'hx-trigger':'change',
            'hx-target':'#addDatasetFormFields',
            'hx-swap': 'innerHTML',
            'disabled': True
        })
    )
    name = forms.ChoiceField(
        label='Layer', 
        required=True,
        error_messages={
            'required': 'Select a layer.',
        },
        widget=forms.Select(attrs={
            'hx-post':reverse_lazy('hx_library:add_dataset'),
            'hx-trigger':'change',
            'hx-target':'#addDatasetFormFields',
            'hx-swap': 'innerHTML',
            'onchange':'resetAddDatasetSubmitBtn()',
            'disabled':True,
        })
    )

    @property
    def cached_handler_key(self):
        clean_data = self.cleaned_data
        url = clean_data.get('url')
        format = clean_data.get('format')
        if url and format:
            return util_helpers.build_cache_key(
                'dataset-handler', 
                format, 
                url
            )
        
    def clean_format(self):
        clean_data = self.cleaned_data
        format = clean_data.get('format')

        if not self.fields['name'].choices:
            url = clean_data.get('url')
            if url and format:
                key = self.cached_handler_key
                handler = cache.get(key)
                if not handler or not handler.layers:
                    handler = dataset_helpers.get_dataset_handler(
                        format, 
                        url=url,
                        key=key,
                    ) 
                if handler and handler.layers:
                    self.fields['name'].choices = form_helpers.dict_to_choices(handler.layers)
                else:
                    raise forms.ValidationError('No layers retrived in this format.')
        
        return format
    