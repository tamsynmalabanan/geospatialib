from django.contrib.gis.db import models

from urllib.parse import urlparse

from helpers.general.models import dict_to_choices
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

    def __str__(self):
        return f'{self.url.domain} ({choices.COLLECTION_FORMATS(self.format)})'
    
class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE)
    name = models.CharField('Name', max_length=255)
    title = models.CharField('Title', max_length=255, default='', blank=True, null=True)

    class Meta:
        unique_together = ['collection', 'name']

    def __str__(self):
        return f'{self.name} in {str(self.collection)}'
