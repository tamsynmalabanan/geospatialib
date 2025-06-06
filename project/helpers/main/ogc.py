from django.contrib.gis.geos import GEOSGeometry, Polygon

import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
from owslib.wfs import WebFeatureService
import psutil
import json

from helpers.main.layers import WORLD_GEOM
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
            geom.transform(4326)
            bbox = geom.extent

        params.update({
            'bbox': list(bbox), 
            'srid': srid, 
            'keywords': list(set(service_keywords + (layer.keywords or []))), 
            'abstract': ('<br><br>'.join([i for i in [service_abstract, (layer.abstract or '')] if i != ''])).strip(), 
            'attribution': service_id.accessconstraints or '',
            'fees': service_id.fees or '',
            'styles': json.dumps(layer.styles)
        })
        layers[i] = params

    return layers

def get_layers_via_et(content, format):
    layers = {}

    root = ET.fromstring(content)
    version = root.attrib['version']
    ns = {
        "xlink": "http://www.w3.org/1999/xlink",
        'ows': 'http://www.opengis.net/ows/1.1',
        format: root.tag.split("}")[0][1:] if "}" in root.tag else None
    }

    is_wms = format == 'wms'
    ns_key = format if is_wms else 'ows'
    service_tag = 'Service' if is_wms else 'ServiceIdentification'
    
    service_id = root.find(f".//{ns_key}:{service_tag}", ns)
    service_keywords = [i.text for i in (service_id.findall(f".//{ns_key}:Keyword", ns) or []) if i is not None]
    service_abstract = service_id.find(f"{ns_key}:Abstract", ns).text
    service_attribution = service_id.find(f"{ns_key}:AccessConstraints", ns).text
    service_fees = service_id.find(f"{ns_key}:Fees", ns).text

    print(root.findall(f".//{ns_key}:FeatureType", ns))
    for layer in root.findall(f".//{ns_key}:Layer", ns):
        name = layer.find(f"{ns_key}:Name", ns)
        if name is not None:
            params = {'type':format}
            
            title = layer.find(f"{ns_key}:Title", ns)
            if title is not None:
                params['title'] = title.text
            
            bounding_boxes = [
                [float(i.attrib[j]) for j in [
                    'minx', 'miny', 'maxx', 'maxy'
                ]] + [i.attrib['CRS']] 
                for i in (layer.findall(f'{ns_key}:BoundingBox', ns) or [])
            ]
            for i in bounding_boxes+[WORLD_GEOM.extent]:
                w,s,e,n,*crs = i
                srid = int(crs[0].split(':')[-1]) if len(crs) > 0 else 4326
                if version == '1.3.0' and srid == 4326:
                    s,w,n,e,*crs = i
                
                if srid in [4326, 84]:
                    bbox = [w,s,e,n]
                    srid = 4326
                    break                    
                
                try:
                    geom = Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)], srid=srid)
                    geom.transform(4326)
                    bbox = geom.extent
                    break
                except Exception as error:
                    print(error)

            layer_abstract = layer.find(f"{ns_key}:Abstract", ns)
            layer_abstract = layer_abstract.text if layer_abstract is not None else ''

            styles = {i.find(f'{ns_key}:Name', ns).text:{
                'title': i.find(f'{ns_key}:Title', ns).text,
                'legend': i.find(f'.//{ns_key}:OnlineResource', ns).attrib["{http://www.w3.org/1999/xlink}href"],
            } for i in (layer.findall(f'{ns_key}:Style', ns) or [])}

            params.update({
                'bbox': list(bbox),
                'srid': srid,
                'keywords': list(set(service_keywords + [i.text for i in (layer.findall(f".//{ns_key}:Keyword", ns) or [])])),
                'abstract': ('<br><br>'.join([i for i in [service_abstract, layer_abstract] if i and i != ''])).strip(), 
                'attribution': service_attribution,
                'fees': service_fees,
                'styles': json.dumps(styles)
            })

            layers[name.text] = params

    return layers

def get_ogc_layers(url, format):
    layers = {}
    
    try:
        type = format.split('-')[-1]
        response = get_response(f'{url}?service={type.upper()}&request=GetCapabilities', raise_for_status=False)
        response.raise_for_status()
        content = response.content
        print(len(content))
        if len(content) < 100000:
            service = None
            if type == 'wms':
                service = WebMapService(url)
            if type == 'wfs':
                service = WebFeatureService(url)
            if service:
                layers = get_layers_via_owslib(service, type)
        else:
            layers = get_layers_via_et(content, type)
    except Exception as e:
        print('get_ogc_layers', e)
    
    return layers