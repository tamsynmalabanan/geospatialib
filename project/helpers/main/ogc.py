from django.contrib.gis.geos import GEOSGeometry, Polygon

import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
import psutil
import json

from helpers.base.utils import get_response

def get_layers_via_owslib(service, format):
    layers = {}
    
    service_id = service.identification
    service_keywords = service_id.keywords or []
    service_abstract = service_id.abstract or ''
    
    for i in list(service.contents):
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
            'keywords': service_keywords + (layer.keywords or []), 
            'abstract': ('<br><br>'.join([i for i in [service_abstract, (layer.abstract or '')] if i != ''])).strip(), 
            'attribution': service_id.accessconstraints or '',
            'fees': service_id.fees or '',
            'styles': json.dumps(layer.styles)
        })
        layers[i] = params

    return layers

def get_layers_via_et(content, format):
    layers = {}

    ns = {f"{format}": f"http://www.opengis.net/{format}"}
    root = ET.fromstring(content)
    
    service_id = root.find(f".//{format}:Service", ns)
    service_keywords = [i.text for i in (service_id.findall(f".//{format}:Keyword", ns) or [])]
    service_abstract = service_id.find(f"{format}:Abstract", ns).text

    for layer in root.findall(f".//{format}:Layer", ns):
        name = layer.find(f"{format}:Name", ns)
        if name is not None:
            params = {'type':f'{format}'}
            
            title = layer.find(f"{format}:Title", ns)
            if title is not None:
                params['title'] = title.text
            
            bbox = layer.findall(f'{format}:BoundingBox', ns)
            print(bbox)

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