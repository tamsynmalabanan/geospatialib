from django.contrib.gis.db import models
from django.forms.models import model_to_dict

from urllib.parse import urlparse

from helpers.base.models import dict_to_choices
from . import choices

class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256)
    auth_srid = models.IntegerField()
    srtext = models.TextField()
    proj4text = models.TextField()

    class Meta:
        managed = False  # No migrations will be created for this model
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

    class Meta:
        unique_together = ['url', 'format']

    # def __str__(self):
    #     return f'{self.url.domain} ({choices.COLLECTION_FORMATS(self.format)})'
    
    def get_layer_data(self):
        return {layer.name: model_to_dict(layer) for layer in self.layers.all()}
    
class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE, related_name='layers')
    name = models.CharField('Name', max_length=512)
    title = models.CharField('Title', max_length=512)
    xField = models.CharField('X Field', max_length=32)
    yField = models.CharField('Y Field', max_length=32)
    srid = models.ForeignKey("main.SpatialRefSys", verbose_name='SRID', on_delete=models.PROTECT)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)

    class Meta:
        unique_together = ['collection', 'name']

    # def __str__(self):
    #     return f'{self.name} in {str(self.collection)}'
