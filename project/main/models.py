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

from urllib.parse import urlparse

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
    
    @property
    def has_layers(self):
        return self.layers.count() > 0

    def get_layer_data(self):
        return {layer.name: layer.data for layer in self.layers.all()}

class ToTSVector(Func):
    function = 'to_tsvector'
    template = "%(function)s('english', %(expressions)s)"

class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE, related_name='layers')
    name = models.CharField('Name', max_length=512)
    title = models.CharField('Title', max_length=512, blank=True, null=True)
    type = models.CharField('Type', max_length=32, blank=True, null=True)
    xField = models.CharField('X Field', max_length=32, blank=True, null=True)
    yField = models.CharField('Y Field', max_length=32, blank=True, null=True)
    srid = models.ForeignKey("main.SpatialRefSys", verbose_name='SRID', on_delete=models.PROTECT, default=4326)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    keywords = models.JSONField('Keywords', default=list, blank=True, null=True)
    abstract = models.TextField('Abstract', blank=True, null=True)
    attribution = models.TextField('Attribution', blank=True, null=True)
    fees = models.TextField('Fees', blank=True, null=True)
    styles = models.JSONField('Styles', default=dict, blank=True, null=True)
    # search_vector = SearchVectorField(null=True)

    search_vector = GeneratedField(
        expression=ToTSVector(
            Coalesce(
                'name',
                'title',
                'abstract',
                'attribution',
                RawSQL("keywords::text", []),
                RawSQL("styles::text", [])
            )
        ),
        output_field=SearchVectorField(),
        db_persist=True
    )

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
    
    # def save(self, *args, **kwargs):
    #     self.search_vector = SearchVector('name', 'title', 'abstract', 'keywords', 'attribution', 'styles')
    #     super().save(*args, **kwargs)