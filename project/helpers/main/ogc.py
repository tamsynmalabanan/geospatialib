from django.core.cache import cache
from owslib.wms import WebMapService
import pickle
from lxml import etree

from helpers.base.utils import create_cache_key

def GET_OGC(format):
    return {
        'ogc-wms': get_wms,
    }[format]

def get_wms(url):
    try:
        return WebMapService(url)
    except Exception as e:
        print(e)