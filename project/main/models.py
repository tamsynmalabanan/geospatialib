from django.contrib.gis.db import models
from django.forms.models import model_to_dict

from urllib.parse import urlparse

from helpers.base.models import dict_to_choices
from helpers.main.layers import WORLD_GEOM
from . import choices

class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256)
    auth_srid = models.IntegerField()
    srtext = models.TextField()
    proj4text = models.TextField()

    class Meta:
        managed = True
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
    count = models.PositiveIntegerField('Count', default=0)

    class Meta:
        unique_together = ['url', 'format']

    def __str__(self):
        return f'{self.url.domain} ({choices.COLLECTION_FORMATS.get(self.format)})'
    
    def get_layer_data(self):
        layer_data = {layer.name: model_to_dict(layer) for layer in self.layers.all()}
        for name, data in layer_data.items():
            bbox = data.get('bbox', WORLD_GEOM)
            layer_data[name]['bbox'] = list(bbox.extent)
        return layer_data
    
class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE, related_name='layers')
    name = models.CharField('Name', max_length=512)
    title = models.CharField('Title', max_length=512, blank=True, null=True)
    type = models.CharField('Type', max_length=32, blank=True, null=True)
    xField = models.CharField('X Field', max_length=32, blank=True, null=True)
    yField = models.CharField('Y Field', max_length=32, blank=True, null=True)
    srid = models.ForeignKey("main.SpatialRefSys", verbose_name='SRID', on_delete=models.PROTECT, default=4326)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    keywords = models.JSONField('Keywords', default=list)
    abstract = models.TextField('Abstract', blank=True, null=True)
    attribution = models.TextField('Attribution', blank=True, null=True)
    fees = models.TextField('Fees', blank=True, null=True)
    styles = models.JSONField('Styles', default=dict)

    class Meta:
        unique_together = ['collection', 'name']

    def __str__(self):
        return f'{self.name} in {str(self.collection)}'