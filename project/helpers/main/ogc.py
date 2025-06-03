from django.contrib.gis.geos import GEOSGeometry, Polygon

import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
import psutil

from helpers.base.utils import get_response

NAMESPACE = '{http://www.opengis.net/wms}'

def get_wms_layers(url):
    layers = {}
    
    try:
        response = get_response(f'{url}?service=WMS&request=GetCapabilities', raise_for_status=False)
        response.raise_for_status()
        content = response.content
        if len(content) > 99999:
            raise Exception('Content size > 99999')
        wms = WebMapService(url)
        
        wms_tags = wms.identification.keywords or []
        wms_abstract = wms.identification.abstract or ''
        
        layer_names = list(wms.contents)
        for i in layer_names:
            layer = wms[i]
            params = {'type': 'wms', 'title': layer.title} 

            bbox = layer.boundingBoxWGS84 or layer.boundingBox or (-180, -90, 180, 90, 'EPSG:4326')
            w,s,e,n,*crs = bbox
            srid = int(crs[0].split(':')[-1]) if len(crs) > 0 else 4326
            if srid != 4326:
                geom = Polygon([(w,s), (e,s), (e,n), (w,n), (w,s)], srid=srid)
                bbox = geom.transform(4326).extent

            params.update({
                'bbox': list(bbox), 
                'srid': srid, 
                'keywords': wms_tags + (layer.keywords or []), 
                'abstract': ('<br><br>'.join([i for i in [wms_abstract, (layer.abstract or '')] if i != ''])).strip(), 
            })
            layers[i] = params
    except Exception as e:
        print('get_wms_layers', e)
    
    return layers