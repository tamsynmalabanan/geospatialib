from django.contrib.gis.geos import GEOSGeometry, Polygon

import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
from owslib.wfs import WebFeatureService
from owslib.wcs import WebCoverageService
import psutil
import json

from helpers.main.layers import WORLD_GEOM
from helpers.base.utils import get_response

def bbox_to_polygon(bbox):
    try:
        w,s,e,n,*crs = bbox
        crs = str(crs[0]).replace('::', ':') if len(crs) > 0 else 'EPSG:4326'
        srid = int(crs.split(':')[-1])
        return Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)], srid=srid)
    except Exception as e:
        print(e, bbox)

def get_layers_via_owslib(service, format):
    layers = {}
    
    service_id = service.identification
    service_keywords = service_id.keywords or []
    service_abstract = service_id.abstract or ''
    
    for i in list(service.contents):
        layer = service[i]
        params = {'type': format, 'title': layer.title} 

        if format == 'wcs':
            bboxes = layer.boundingboxes + [{'nativeSrs':'4326', 'bbox':[-90,-180,90,180]}]
            for b in bboxes:
                bbox = b.get('bbox')
                if not bbox:
                    continue
                srid = int(b.get('nativeSrs', '').split('/')[-1])
                s,w,n,e = bbox
                if srid == 4326:
                    break
            bbox = [w,s,e,n]
        else:
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

    service_layers = root.findall(f".//{ns_key}:Layer", ns)+root.findall(f".//{format}:FeatureType", ns)
    for layer in service_layers:
        name = layer.find(f"{format}:Name", ns)
        if name is not None:
            params = {'type':format}
            
            title = layer.find(f"{format}:Title", ns)
            if title is not None:
                params['title'] = title.text
            
            if is_wms:
                bounding_boxes = [
                    [float(i.attrib[j]) for j in [
                        'minx', 'miny', 'maxx', 'maxy'
                    ]] + [i.attrib['CRS']] 
                    for i in (layer.findall(f'{format}:BoundingBox', ns) or [])
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
            
            if format == 'wfs':
                crs = layer.find(f"{format}:DefaultCRS", ns)
                srid = int(crs.text.split(':')[-1]) if crs else 4326
                
                lower_corner = layer.find(f".//{ns_key}:LowerCorner", ns)
                upper_corner = layer.find(f".//{ns_key}:UpperCorner", ns)
                w,s = [float(i) for i in lower_corner.text.split(' ')] if lower_corner is not None else [-180, -90]
                e,n = [float(i) for i in upper_corner.text.split(' ')] if upper_corner is not None else [180, 90]

                if srid == 4326:
                    bbox = [w,s,e,n]
                else:
                    geom = Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)], srid=srid)
                    geom.transform(4326)
                    bbox = geom.extent

            layer_abstract = layer.find(f"{format}:Abstract", ns)
            layer_abstract = layer_abstract.text if layer_abstract is not None else ''

            styles = {i.find(f'{format}:Name', ns).text:{
                'title': i.find(f'{format}:Title', ns).text,
                'legend': i.find(f'.//{format}:OnlineResource', ns).attrib["{http://www.w3.org/1999/xlink}href"],
            } for i in (layer.findall(f'{format}:Style', ns) or [])}

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
        if len(content) < 100000:
            service = None
   
            if type == 'wms':
                service = WebMapService(url)
            if type == 'wfs':
                service = WebFeatureService(url)
            if type == 'wcs':
                service = WebCoverageService(url)
   
            if service:
                layers = get_layers_via_owslib(service, type)
        else:
            layers = get_layers_via_et(content, type)
    except Exception as e:
        print('get_ogc_layers', e)
    
    return layers