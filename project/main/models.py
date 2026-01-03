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

from urllib.parse import urlparse, urlencode
from deep_translator import GoogleTranslator
import json
import re

from helpers.main.utils import create_extent_map, create_xyz_map
from helpers.base.utils import get_special_characters
from helpers.base.models import dict_to_choices
from helpers.main.constants import WORLD_GEOM
from . import choices

import logging
logger = logging.getLogger('django')

class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256)
    auth_srid = models.IntegerField()
    srtext = models.TextField()
    proj4text = models.TextField()

    class Meta:
        managed = False
        db_table = 'spatial_ref_sys'

    @property
    def title(self):
        return f'{self.auth_name}:{self.srid}'

    def __str__(self):
        return self.title
    
class SpatialRefSysExt(models.Model):
    srs = models.ForeignKey("main.SpatialRefSys", verbose_name='Spatial reference system', on_delete=models.CASCADE)
    srid = models.CharField('SRID', max_length=64, default='', blank=True, null=True)
    source = models.CharField('Source', max_length=255, default='', blank=True, null=True)
    type = models.CharField('Type', max_length=255, default='', blank=True, null=True)
    name = models.CharField('Name', max_length=255, default='', blank=True, null=True)
    unit = models.CharField('Unit', max_length=255, default='', blank=True, null=True)
    scope = models.CharField('Scope', max_length=255, default='', blank=True, null=True)
    extent = models.TextField('Extent', default='', blank=True, null=True)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    x_min = models.FloatField('West', default=0, blank=True, null=True)
    y_min = models.FloatField('South', default=0, blank=True, null=True)
    x_max = models.FloatField('East', default=0, blank=True, null=True)
    y_max = models.FloatField('North', default=0, blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Spatial Reference Systems (extended)'

    def __str__(self) -> str:
        return f'{self.name} ({self.srid})'

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
    added_by = models.ForeignKey("customuser.User", verbose_name='Added by', on_delete=models.DO_NOTHING, blank=True, null=True)
    url:URL = models.ForeignKey("main.URL", verbose_name='URL', on_delete=models.CASCADE)
    format = models.CharField('Format', max_length=16, choices=dict_to_choices(choices.COLLECTION_FORMATS))
    dynamic = models.BooleanField('Dynamic', default=False)
    last_update = models.DateTimeField('Last update', auto_now=True)

    class Meta:
        unique_together = ['url', 'format']

    def __str__(self):
        return f'{self.url.domain} ({choices.COLLECTION_FORMATS.get(self.format)})'
    
    @property
    def layers_metadata(self):
        return {layer.name: layer.metadata for layer in self.layers.all()}
    
    @property
    def layers_access(self):
        return {layer.name: layer.access for layer in self.layers.all()}

class ToTSVector(Func):
    function = 'to_tsvector'
    template = "%(function)s('english', %(expressions)s)"

class Layer(models.Model):
    collection = models.ForeignKey("main.Collection", verbose_name='Collection', on_delete=models.CASCADE, related_name='layers')
    name = models.CharField('Name', max_length=512)
    type = models.CharField('Type', max_length=32, blank=True, null=True)
    xField = models.CharField('X Field', max_length=32, blank=True, null=True)
    yField = models.CharField('Y Field', max_length=32, blank=True, null=True)
    srid:SpatialRefSys = models.ForeignKey("main.SpatialRefSys", verbose_name='SRID', on_delete=models.PROTECT, default=4326)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    tags = models.CharField('Overpass Tag', max_length=512, blank=True, null=True)

    title = models.CharField('Title', max_length=512, blank=True, null=True)
    attribution = models.TextField('Attribution', blank=True, null=True)
    fees = models.TextField('Fees', blank=True, null=True)
    styles = models.JSONField('Styles', default=dict, blank=True, null=True)
    
    abstract = models.TextField('Abstract', blank=True, null=True)
    keywords = models.JSONField('Keywords', default=list, blank=True, null=True)
    thumbnails = models.JSONField('Thumbnails', default=list, blank=True, null=True)
    
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
    def bbox_extent(self):
        bbox = self.bbox
        return list(bbox.extent) if bbox and not bbox.empty else list(WORLD_GEOM.extent)
    @property
    def metadata(self):
        data = {key: value for key, value in model_to_dict(
            self, exclude=['search_vector', 'collection', 'id', 'bbox']
        ).items() if value is not None} 

        data['bbox'] = self.bbox_extent
        
        collection = self.collection
        data['url'] = collection.url.path
        data['format'] = collection.format

        return data
    
    @property
    def access(self):
        return {
            'url': self.collection.url.path,
            'format': self.collection.format,
            'type': self.type,
            'name': self.name,
            'attribution': self.attribution,
            'bbox': self.bbox_extent,
            'srid': self.srid.srid,
            'xField': self.xField,
            'yField': self.yField,
            'styles': self.styles,
            'title': self.title,
        }
    
    def set_thumbnails(self):
        if not self.thumbnails:
            thumbnails = []

            if self.type == 'overpass':
                tags = [i.replace('[', '') for i in self.tags.split(']') if i.strip() != '']
                for tag in tags:
                    try:
                        if any(i in tag for i in ['=', '~']):
                            key, value = re.split(r'[=~]', tag, maxsplit=1)
                            key = key.split('"')[1]
                            value = value.split('"')[1].strip(''.join(get_special_characters(value)))
                            thumbnails = thumbnails + [
                                f'https://taginfo.openstreetmap.org/api/4/tag/distribution/nodes?key={key}&value={value}',
                                f'https://taginfo.openstreetmap.org/api/4/tag/distribution/ways?key={key}&value={value}',
                            ]
                        else:
                            key = tag.split('"')[1]
                            thumbnails = thumbnails + [
                                f'https://taginfo.openstreetmap.org/api/4/key/distribution/nodes?key={key}',
                                f'https://taginfo.openstreetmap.org/api/4/key/distribution/ways?key={key}',
                            ]
                    except Exception as e:
                        logger.error(f'{e}, {tag}')

            if self.type == 'wms':
                 for style in json.loads(self.styles):
                    params = {
                        "service": "WMS",
                        "version": "1.3.0",
                        "request": "GetMap",
                        "layers": self.name,
                        "styles": style,
                        "crs": "EPSG:4326",
                        "bbox": "-180,-90,180,90",
                        "width": "360",
                        "height": "180",
                        "format": "image/png",
                        "transparent": "true"
                    }
                    encoded_params = urlencode(params)
                    thumbnails.append(f'{self.collection.url.path}?{encoded_params}')

            if self.type == 'xyz':
                thumbnails = [i for i in [create_xyz_map(self.collection.url.path)] if i]
            
            if not thumbnails:
                thumbnails = [i for i in [create_extent_map(self.bbox.extent)] if i]

            self.thumbnails = [i for i in thumbnails if i]

    @property
    def db_version(self):
        if not hasattr(self, '_db_version'):
            self._db_version = type(self).objects.get(pk=self.pk) if self.pk else None
        return self._db_version

    def translate_fields(self):
        try:
            db_version = self.db_version
            translator = GoogleTranslator(source='auto', target='en')

            if self.abstract and (not db_version or (db_version.abstract != self.abstract)):
                translated_abstract = translator.translate(self.abstract)
                if translated_abstract and translated_abstract != self.abstract:
                    self.abstract = translated_abstract + ' (Translated via <a href="https://github.com/nidhaloff/deep-translator" target="_blank">deep-translator</a> and <a href="https://translate.google.com/?sl=auto&tl=en&op=translate" target="_blank">Google Translate API</a>)'

            if self.keywords and (not db_version or (set(db_version.keywords) != set(self.keywords))):
                translated_keywords = json.loads(translator.translate(json.dumps(self.keywords)))
                if translated_keywords:
                    self.keywords = translated_keywords
        except Exception as e:
            logger.error(f'translate_fields, {e}')

    def normalize_keywords(self):
        db_version = self.db_version
        if self.keywords and (not db_version or (set(db_version.keywords) != set(self.keywords))):
            self.keywords = sorted(set([str(k).strip().lower() for k in self.keywords]))

    def save(self, *args, **kwargs):
        self.normalize_keywords()
        self.translate_fields()
        self.set_thumbnails()
        super().save(*args, **kwargs)