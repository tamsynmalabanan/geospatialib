from django.core.cache import cache
from django.contrib.gis.geos import Polygon
from django.contrib.gis.gdal import SpatialReference

from owslib import wms, wfs
from urllib.parse import urlparse, urlunparse
import json
import validators

from . import geom_helpers
from ..general import util_helpers, model_helpers
from apps.library import choices, models


class DatasetHandler():
    access_url = None
    layers = None

    def __init__(self, format, url, key):
        self.format = format
        self.url = url
        self.key = key
        
        self.handler()

        cache.set(key, self, timeout=3600)

    def handler(self):
        pass

class XYZHandler(DatasetHandler):

    def get_layers(self):
        name = util_helpers.get_domain_name(self.url)
        return {name: name}
    
    def handler(self):
        self.access_url = self.url
        self.layers = self.get_layers()

    def populate_dataset(self, dataset):
        dataset.title = dataset.name.replace('_', ' ')
        dataset.bbox = geom_helpers.WORLD_GEOM
        dataset.tags.set(
            model_helpers.collect_url_tags(
                util_helpers.remove_query_params(self.access_url)
            )
        )

        dataset.save()

class ArcGISImageHandler(DatasetHandler):

    def get_layers(self):
        domain = urlparse(self.url).netloc
        if domain.endswith('arcgis.com'):
            name = self.url.split('.arcgis.com/arcgis/rest/services/')[1].split('/ImageServer')[0].replace('/', ' ')
        else:
            name = util_helpers.get_domain_name(self.url)
        return {name: name}
    
    def handler(self):
        self.access_url = self.url
        self.layers = self.get_layers()

    def populate_dataset(self, dataset):
        dataset.title = dataset.name.replace('_', ' ')
        dataset.bbox = geom_helpers.WORLD_GEOM
        dataset.tags.set(
            model_helpers.collect_url_tags(
                util_helpers.remove_query_params(self.access_url)
            )
        )

        dataset.save()

class OGCHandlers(DatasetHandler):
    
    def get_service(self):
        handler = None

        if self.format == 'wms':
            handler = wms.WebMapService
        
        if self.format == 'wfs':
            handler = wfs.WebFeatureService

        if handler:
            try:
                return handler(self.access_url)
            except:
                pass
    
    def get_layers(self, service):
        contents = service.contents
        layers = {}
        for layer_name in contents:
            layers[layer_name] = service[layer_name].title
        return layers

    def handler(self):
        clean_url = util_helpers.remove_query_params(self.url)
        self.access_url = clean_url

        service = self.get_service()
        if service:
            self.layers = self.get_layers(service)

    def get_title(self, layer):
        if layer and hasattr(layer, 'title'):
            title = layer.title
        else:
            title = self.dataset.name
        return title.replace('_', ' ')

    def get_bbox(self, layer):
        bbox = None
        
        if layer:
            for attr in ['boundingBoxWGS84', 'boundingBox']:
                if hasattr(layer, attr) and isinstance(getattr(layer, attr), (list, tuple)):
                    bbox = getattr(layer, attr)
                    break
        
        if bbox:
            w,s,e,n,*srid = bbox
            bbox_corners = [(w,s), (e,s), (e,n), (w,n), (w,s)]
            if len(srid) != 0 and ':' in srid[0]:
                bbox_srid = int(srid[0].split(':')[1])
            else:
                bbox_srid = 4326
            
            geom = Polygon(bbox_corners, srid=bbox_srid)
            if bbox_srid == 4326:
                return geom
            else:
                wgs84_srs = SpatialReference(4326)
                return geom.transform(wgs84_srs, clone=True)
        else:
            return geom_helpers.WORLD_GEOM

    def get_tags(self, id, layer):
        url_tag_instances = model_helpers.collect_url_tags(self.access_url)

        keywords = []
        for obj in [id, layer]:
            if obj and hasattr(obj, 'keywords') and isinstance(obj.keywords, (list, tuple)):
                keywords = keywords + list(obj.keywords)
        keywords = list(set([kw for kw in keywords if isinstance(kw, str)]))
        kw_tag_instances = model_helpers.list_to_tags(keywords)

        return url_tag_instances + kw_tag_instances

    def get_abstract(self, id, layer):
        abstracts = []
        for obj in [id, layer]:
            if obj and hasattr(obj, 'abstract'):
                abstract = obj.abstract
                if isinstance(abstract, str) and abstract.strip() not in ['', 'None', 'null']:
                    abstracts.append(abstract)
        return '<br><br>'.join(abstracts)

    def get_extra_data(self, id, provider, layer):
        data = {}
        
        if id:
            id_vars = {}
            for attr in ['accessconstraints', 'fees']:
                if hasattr(id, attr):
                    id_vars[attr] = getattr(id, attr)
            data['id'] = id_vars
        
        if layer:
            layer_vars = {}
            for attr in ['queryable', 'styles', 'dataUrls', 'metadataUrls']:
                if hasattr(layer, attr):
                    layer_vars[attr] = getattr(layer, attr)
            if hasattr(layer, 'auth') and hasattr(getattr(layer, 'auth'), '__dict__'):
                layer_vars['auth'] = vars(getattr(layer, 'auth'))
            data['layer'] = layer_vars

        if provider:
            provider_vars = {}
            for attr in ['name', 'url']:
                if hasattr(provider, attr):
                    provider_vars[attr] = getattr(provider, attr)
            if hasattr(provider, 'contact') and hasattr(getattr(provider, 'contact'), '__dict__'):
                provider_vars['contact'] = vars(getattr(provider, 'contact'))
            data['provider'] = provider_vars

        return data

    def populate_dataset(self, dataset):
        self.dataset = dataset

        service = self.get_service()
        if service:
            id = service.identification
            provider = service.provider
            layer = service[dataset.name]

            extra_data = self.get_extra_data(id, provider, layer)
            dataset.extra_data = json.dumps(extra_data)
            
            styles = extra_data.get('layer', {}).get('styles', {})
            if styles:
                name = list(styles.keys())[0]
                dataset.default_style = name
                
                url = styles[name].get('legend')
                if validators.url(url):
                    url_instance, created = models.URL.objects.get_or_create(url=url)
                    if url_instance:
                        dataset.default_legend = url_instance
            
            dataset.title = self.get_title(layer)
            dataset.bbox = self.get_bbox(layer)
            dataset.abstract = self.get_abstract(id, layer)
            dataset.tags.set(self.get_tags(id, layer))
            dataset.save()

    def test_connection(self, layer_name):
        service = self.get_service()
        if service:
            layer = service[layer_name]
            if layer:
                try:
                    response = service.getmap(
                        layers=[layer.id],
                        srs='EPSG:4326',
                        bbox=layer.boundingBoxWGS84,
                        size=(512, 512),
                        format='image/jpeg',
                        transparent=True
                    )
                    return response.read()
                except Exception as e:
                    return None

class WMSHandler(OGCHandlers):
    pass

class WFSHandler(OGCHandlers):
    pass


def get_dataset_handler(format, **kwargs):
    handler = {
        'xyz': XYZHandler, 
        'wms': WMSHandler, 
        'wfs': WFSHandler, 
        'arcgis-image': ArcGISImageHandler, 
    }.get(format)

    if handler:
        return handler(format, **kwargs)

def get_dataset_format(url):
    helpers = {
        'xyz': ['{x}','{y}','{z}', 'tile'],
        'arcgis-image': ['ImageServer'],
    }
    format_list = list(choices.DATASET_FORMATS.keys())
    match = util_helpers.get_first_substring_match(url, format_list, helpers)
    return match

