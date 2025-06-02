from django.core.cache import cache
from owslib.wms import WebMapService

from helpers.base.utils import create_cache_key

def GET_OGC(format):
    return {
        'ogc-wms': get_wms,
    }[format]

def get_wms(url):
    try:
        # cacheKey = create_cache_key(['ogc-wms', url])
        # wms = cache.get(cacheKey)
        # if not wms:
            return WebMapService(url)
            # cache.set(cacheKey, wms, 60*60)
    except Exception as e:
        print(e)