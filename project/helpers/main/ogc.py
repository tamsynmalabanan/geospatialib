from django.core.cache import cache
from owslib.wms import WebMapService
import pickle
from lxml import etree

from helpers.base.utils import create_cache_key

def get_wms_layers(url):
    try:
        wms = get_wms(url)
        layer_names = list(wms.contents)
        layers = {}
        for i in layer_names:
            layer = wms[i]
            params = {'title': layer.title, 'type':'wms'} 

            bbox = layer.boundingBoxWGS84 or layer.boundingBox
            w,s,e,n,*srid = bbox or (-180, -90, 180, 90, 4326)
            srid = int(srid[0].split(':')[-1]) if len(srid) > 0 else 4326
            # transform bbox if not 4326
            params.update({
                'bbox': bbox, 
                'srid': srid, 
            })

            layers[i] = params
        return layers
    except Exception as e:
        print('get_wms_layers', e)
    return {}

def get_wms(url):
    try:
        return WebMapService(url)
    except Exception as e:
        print(e)