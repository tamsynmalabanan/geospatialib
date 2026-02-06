from django import forms

from .models import Collection

class CollectionForm(forms.Form):
    url = forms.URLField(
        label='URL',
        required=False,
        widget=forms.URLInput(attrs={
            'type':'search',
            'class':'form-control form-control-sm fs-12 rounded-end',
        })
    )

    format = forms.ChoiceField(
        label='Format', 
        required=False,
        error_messages={ 'required': 'Select a format.', },
        choices=[('','Select a format')]+Collection._meta.get_field('format').choices, 
        widget=forms.Select(attrs={
            'disabled': True,
            'class':'form-select form-select-sm fs-12 rounded-end',
        })
    )        

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auto_id = f"{self.__class__.__name__.lower()}_%s"