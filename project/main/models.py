from django.contrib.gis.db import models
from django.db.models import Func
from django.forms.models import model_to_dict
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.contrib.postgres.search import SearchVectorField
from django.db.models.functions import Coalesce
from django.db.models import GeneratedField
from django.db.models.expressions import RawSQL
from django.db.models import Func, Value, TextField, F
from django.db.models.functions import Concat
from django.db.models.functions import Cast
from django.contrib.postgres.search import SearchVectorField

from urllib.parse import urlparse
from deep_translator import GoogleTranslator
import json

from helpers.base.models import dict_to_choices
from helpers.main.constants import WORLD_GEOM
from . import choices

class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256)
    auth_srid = models.IntegerField()
    srtext = models.TextField()
    proj4text = models.TextField()

    class Meta:
        managed = False
        db_table = 'spatial_ref_sys'

    def __str__(self):
        return f'{self.auth_name}:{self.srid}'

class URL(models.Model):
    path = models.URLField('Path', max_length=512, unique=True)
    
    class Meta:
        verbose_name_plural = 'URLs'

    def __str__(self) -> str:
        return self.path

    @property
    def domain(self):
        return urlparse(self.path).netloc

class Collection(models.Model):
    url:URL = models.ForeignKey("main.URL", verbose_name='URL', on_delete=models.CASCADE)
    format = models.CharField('Format', max_length=16, choices=dict_to_choices(choices.COLLECTION_FORMATS))
    last_update = models.DateTimeField('Last update', auto_now=True)

    class Meta:
        unique_together = ['url', 'format']

    def __str__(self):
        return f'{self.url.domain} ({choices.COLLECTION_FORMATS.get(self.format)})'
    
    def get_layers(self):
        return {layer.name: layer.data for layer in self.layers.all()}

class ToTSVector(Func):
    function = 'to_tsvector'
    template = "%(function)s('english', %(expressions)s)"

class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE, related_name='layers')
    name = models.CharField('Name', max_length=512)
    type = models.CharField('Type', max_length=32, blank=True, null=True)
    xField = models.CharField('X Field', max_length=32, blank=True, null=True)
    yField = models.CharField('Y Field', max_length=32, blank=True, null=True)
    srid = models.ForeignKey("main.SpatialRefSys", verbose_name='SRID', on_delete=models.PROTECT, default=4326)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    
    title = models.CharField('Title', max_length=512, blank=True, null=True)
    attribution = models.TextField('Attribution', blank=True, null=True)
    fees = models.TextField('Fees', blank=True, null=True)
    styles = models.JSONField('Styles', default=dict, blank=True, null=True)
    
    abstract = models.TextField('Abstract', blank=True, null=True)
    keywords = models.JSONField('Keywords', default=list, blank=True, null=True)
    
    last_update = models.DateTimeField('Last update', auto_now=True)
    search_vector = GeneratedField(expression=ToTSVector(Concat(
        'name', Value(' '),
        'title', Value(' '),
        'abstract', Value(' '),
        'attribution', Value(' '),
        RawSQL("keywords::text", []), Value(' '),
        RawSQL("styles::text", []),
        output_field=TextField()
    )), output_field=SearchVectorField(), db_persist=True)
    
    class Meta:
        unique_together = ['collection', 'name']
        indexes = [GinIndex(fields=["search_vector"])]

    def __str__(self):
        return f'{self.name} in {str(self.collection)}'
    
    @property
    def data(self):
        data = {key: value for key, value in model_to_dict(
            self, exclude=['search_vector', 'collection', 'id', 'bbox']
        ).items() if value is not None} 

        bbox = self.bbox
        data['bbox'] = list(bbox.extent) if bbox and not bbox.empty else list(WORLD_GEOM.extent)
        
        return data
    
    @property
    def old(self):
        if not hasattr(self, '_cached_old'):
            self._cached_old = type(self).objects.get(pk=self.pk) if self.pk else None
        return self._cached_old

    def translate_fields(self):
        try:
            old = self.old
            translator = GoogleTranslator(source='auto', target='en')

            if self.abstract and (not old or (old.abstract != self.abstract)):
                translated_abstract = translator.translate(self.abstract)
                if translated_abstract:
                    self.abstract = translated_abstract

            if self.keywords and (not old or (old.keywords != self.keywords)):
                translated_keywords = json.loads(translator.translate(json.dumps(self.keywords)))
                if translated_keywords:
                    self.keywords = translated_keywords
        except Exception as e:
            print(e)

    def normalize_keywords(self):
        self.keywords = sorted(set([str(k).strip().lower() for k in self.keywords]))

    def save(self, *args, **kwargs):
        self.normalize_keywords()
        self.translate_fields()
        super().save(*args, **kwargs)    
