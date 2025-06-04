from django.contrib.gis.geos import GEOSGeometry, Polygon

import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
import psutil
import json

from helpers.base.utils import get_response

NAMESPACE = '{http://www.opengis.net/wms}'

def get_layers_via_owslib(service, format):
    service_id = service.identification
    service_tags = service_id.keywords or []
    service_abstract = service_id.abstract or ''
    layer_names = list(service.contents)
    
    layers = {}
    for i in layer_names:
        layer = service[i]
        params = {'type': format, 'title': layer.title} 

        bbox = layer.boundingBoxWGS84 or layer.boundingBox or (-180, -90, 180, 90, 'EPSG:4326')
        w,s,e,n,*crs = bbox
        srid = int(crs[0].split(':')[-1]) if len(crs) > 0 else 4326
        if srid != 4326:
            geom = Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)], srid=srid)
            bbox = geom.transform(4326).extent

        params.update({
            'bbox': list(bbox), 
            'srid': srid, 
            'keywords': service_tags + (layer.keywords or []), 
            'abstract': ('<br><br>'.join([i for i in [service_abstract, (layer.abstract or '')] if i != ''])).strip(), 
            'attribution': service_id.accessconstraints or '',
            'fees': service_id.fees or '',
            'styles': json.dumps(layer.styles)
        })
        layers[i] = params
    return layers

def get_layers_via_et(content, format):
    layers = {}

    ns = {format: f"http://www.opengis.net/{format}"}
    root = ET.fromstring(content)
    for layer in root.findall(f".//{format}:Layer", ns):
        params = {'type': format}
        name = layer.find(f"{format}:Name", ns)
        title = layer.find(f"{format}:Title", ns)
        params.update({
            'title': title.text
        })
        layers[name.text] = params
        
    return layers

def get_wms_layers(url):
    layers = {}
    
    try:
        response = get_response(f'{url}?service=WMS&request=GetCapabilities', raise_for_status=False)
        response.raise_for_status()
        content = response.content
        if len(content) < 100000:
            wms = WebMapService(url)
            layers = get_layers_via_owslib(wms, 'wms')
        else:
            layers = get_layers_via_et(content, 'wms')
    except Exception as e:
        print('get_wms_layers', e)
    
    return layers