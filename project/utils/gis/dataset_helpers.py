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

    def __init__(self, url, key=None):
        self.url = url
        self.key = key
        
        self.handler()

        if key:
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
        bboxes = []
        
        if layer:
            for attr in ['boundingBoxWGS84', 'boundingBox']:
                if hasattr(layer, attr) and isinstance(getattr(layer, attr), (list, tuple)):
                    bboxes.append(getattr(layer, attr))
        
        if bboxes:
            geoms = []
            for bbox in bboxes:
                w,s,e,n,*srid = bbox
                bbox_corners = [(w,s), (e,s), (e,n), (w,n), (w,s)]
                try:
                    bbox_srid = int(srid[0].split(':')[-1])
                except:
                    bbox_srid = 4326
                
                geom = Polygon(bbox_corners, srid=bbox_srid)
                if bbox_srid != 4326:
                    wgs84_srs = SpatialReference(4326)
                    geom = geom.transform(wgs84_srs, clone=True)
                geoms.append(geom)

            if geoms: 
                merged_geom = geoms[0] 
                if len(geoms) > 1:
                    for geom in geoms[1:]: 
                        merged_geom = merged_geom.union(geom)
                    merged_geom = merged_geom.envelope
                return merged_geom

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
            if hasattr(layer, 'crsOptions'):
                layer_vars['crsOptions'] = [str(i) for i in getattr(layer, 'crsOptions')]
            data['layer'] = layer_vars

        if provider:
            provider_vars = {}
            for attr in ['name', 'url']:
                if hasattr(provider, attr):
                    provider_vars[attr] = getattr(provider, attr)
            if hasattr(provider, 'contact') and hasattr(getattr(provider, 'contact'), '__dict__'):
                contact = vars(getattr(provider, 'contact'))
                if '_root' in contact:
                    del contact['_root']
                provider_vars['contact'] = contact
            data['provider'] = provider_vars

        return data
    
    def populate_dataset(self, dataset):
        self.dataset = dataset

        service = self.get_service()
        if service:
            id = service.identification
            # provider = service.provider
            layer = service[dataset.name]

            # extra_data = self.get_extra_data(id, provider, layer)

            if hasattr(layer, 'styles'):
                styles = layer.styles
                if styles:
                    name = list(styles.keys())[0]
                    print('default_style')
                    dataset.default_style = name
                    
                    url = styles[name].get('legend')
                    if validators.url(url):
                        url_instance, created = models.URL.objects.get_or_create(url=url)
                        if url_instance:
                            print('default_legend')
                            dataset.default_legend = url_instance
            
            if hasattr(layer, 'crsOptions'):
                crs_options = [str(i) for i in layer.crsOptions]
                if crs_options:
                    epsg_4326 = [i for i in crs_options if i.endswith(':4326')]
                    if epsg_4326:
                        self.default_crs = epsg_4326[0]
                    else:
                        self.default_crs = crs_options[0]
            print('default_crs')
            dataset.default_crs = self.default_crs

            print('title')
            dataset.title = self.get_title(layer)
            print('bbox')
            dataset.bbox = self.get_bbox(layer)
            print('abstract')
            dataset.abstract = self.get_abstract(id, layer)
            print('tags')
            dataset.tags.set(self.get_tags(id, layer))
            print('done')
            dataset.save()
            print('saved')

class WMSHandler(OGCHandlers):
    default_crs = 'EPSG:4326'
    
    def get_service(self):
        try:
            return wms.WebMapService(self.access_url)
        except Exception as e:
            print(e)
            
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
                        transparent=True,
                    )
                    return response.read()
                except Exception as e:
                    print(e)

class WFSHandler(OGCHandlers):
    default_crs = 'urn:ogc:def:crs:EPSG::4326'
    
    def get_service(self):
        try:
            return wfs.WebFeatureService(self.access_url, version='2.0.0')
        except Exception as e:
            print(e)

    def test_connection(self, layer_name):
        service = self.get_service()
        if service:
            layer = service[layer_name]
            if layer:
                try:
                    bbox = list(layer.boundingBox)
                    crs = str(bbox[-1])
                    response = service.getfeature(
                        typename=layer_name, 
                        bbox=bbox[:-1] + [crs], 
                        srsname=crs,
                        outputFormat='json',
                        maxfeatures=1,
                    )
                    return response.read()
                except Exception as e:
                    print(e)


def get_dataset_handler(format, **kwargs):
    handler = {
        'xyz': XYZHandler, 
        'wms': WMSHandler, 
        'wfs': WFSHandler, 
        'arcgis-image': ArcGISImageHandler, 
    }.get(format)

    if handler:
        return handler(**kwargs)

def get_dataset_format(url):
    helpers = {
        'xyz': ['{x}','{y}','{z}', 'tile'],
        'arcgis-image': ['ImageServer'],
    }
    format_list = list(choices.DATASET_FORMATS.keys())
    match = util_helpers.get_first_substring_match(url, format_list, helpers)
    return match

