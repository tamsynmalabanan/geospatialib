from django.core.cache import cache

from celery import shared_task
import requests

from .models import URL, Collection, Layer
from helpers.general.utils import ok_url_response
from helpers.gis.layers import create_layer_instance

# @shared_task
@shared_task(
    bind=True, 
    autoretry_for=(Exception,), 
    retry_backoff=60, 
    max_retries=3
)
def onboard_collection(self, cacheKey):
    cached_collection = cache.get(cacheKey)
    if not cached_collection:
        return
    
    try:
        url = cached_collection['url']
        url_instance = URL.objects.filter(path=url).first()
        if not url_instance:
            if ok_url_response(url):
                url_instance, created = URL.objects.get_or_create(path=url)
            else:
                raise Exception('URL response not ok.')
        if not url_instance:
            raise Exception('No URL instance exists or created.')

        format = cached_collection['format']
        collection_instance = Collection.objects.filter(url=url_instance, format=format).first()
        if not collection_instance:
            collection_instance, created = Collection.objects.get_or_create(url=url_instance, format=format)
        if not collection_instance:
            raise Exception('No Collection instance exists or created.')

        onboarded_layers = []
        layers = cached_collection['layers']
        for name, params in layers.items():
            layer_instance - Layer.objects.filter(collection=collection_instance, name=name).first()
            if not layer_instance:
                layer_instance = create_layer_instance(url, format, name, params)
                # layer_instance, created = Layer.objects.get_or_create(
                #     collection=collection_instance,
                #     name=name,
                #     params=params,
                # )
            if layer_instance:
                onboarded_layers.append(layer_instance.name)
        
        onboarding_complete = set(layers.keys()) == set(onboarded_layers)
        last_retry = self.request.retries >= self.max_retries

        if onboarding_complete or last_retry:
            cache.delete(cacheKey)
            if collection_instance.layers.count() == 0:
                return collection_instance.delete()
            else:
                return collection_instance
        else:
            raise Exception('Not all layers have been onboarded.')
    except Exception as e:
        print('onboard_collection error', e)
        # self.retry()