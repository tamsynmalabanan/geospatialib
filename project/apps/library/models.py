from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GinIndex

from urllib.parse import urlparse

from . import choices
from utils.general import form_helpers

class Dataset(models.Model):
    url = models.ForeignKey("library.URL", verbose_name='URL', on_delete=models.CASCADE, related_name='datasets')
    format = models.CharField('Format', max_length=32, choices=form_helpers.dict_to_choices(choices.DATASET_FORMATS))
    name = models.CharField('Layer', max_length=255)

    default_style = models.CharField('Default style name', max_length=255, blank=True, null=True)
    default_legend = models.ForeignKey("library.URL", verbose_name='Default style url', on_delete=models.PROTECT, blank=True, null=True)
    default_crs = models.CharField('Default CRS', max_length=32, blank=True, null=True)

    title = models.CharField('Title', max_length=255, blank=True, null=True)
    abstract = models.TextField('Abstract', blank=True, null=True)
    tags = models.ManyToManyField("library.Tag", verbose_name='Tags', blank=True)
    bbox = models.PolygonField('Bounding box', blank=True, null=True)


    class Meta:
        unique_together = ['url', 'format', 'name']
        indexes = [
            # for apply_query_filters()
            models.Index(fields=[
                'format', 
                'bbox'
            ]),

            # for perform_full_text_search()
            models.Index(fields=[
                'url',
                'name',
                'title',
                'abstract',
            ]),
        ]

    def __str__(self) -> str:
        if self.title:
            return self.title
        return self.name

class Tag(models.Model):
    tag = models.CharField('Tag', max_length=64, unique=True)

    class Meta:
        indexes = [
            models.Index(fields=['tag']),
        ]


    def __str__(self) -> str:
        return self.tag
    
    def save(self, *args, **kwargs):
        self.tag = self.tag.lower()
        return super().save(*args, **kwargs)

class URL(models.Model):
    url = models.URLField('URL', max_length=255, unique=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['url']),
        ]

    def __str__(self) -> str:
        return self.url

    @property
    def domain(self):
        return urlparse(self.url).netloc
