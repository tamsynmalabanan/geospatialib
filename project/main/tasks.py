from django.core.cache import cache

from celery import shared_task
import requests

from .models import URL, Collection, Layer
from helpers.base.utils import ok_url_response
from helpers.main.layers import LAYER_VALIDATORS

@shared_task(
    bind=True, 
    autoretry_for=(Exception,),
    retry_backoff=1, 
    max_retries=3,
)
def onboard_collection(self, cacheKey):
    cached_collection = cache.get(cacheKey)
    if not cached_collection:
        return

    url = cached_collection.get('url')
    format = cached_collection.get('format')
    layers = cached_collection.get('layers')
    if not all([url, format, layers]):
        return

    collection_instance = None

    try:
        url_instance = URL.objects.filter(path=url).first()
        if not url_instance:
            if ok_url_response(url):
                url_instance, created = URL.objects.get_or_create(path=url)
            else:
                raise Exception('URL response not ok.')
        if not url_instance:
            raise Exception('No URL instance exists or created.')

        collection_instance = Collection.objects.filter(url=url_instance, format=format).first()
        if not collection_instance:
            collection_instance, created = Collection.objects.get_or_create(url=url_instance, format=format)
        if not collection_instance:
            raise Exception('No Collection instance exists or created.')

        onboarded_layers = []
        for name, params in layers.items():
            layer_instance = Layer.objects.filter(collection=collection_instance, name=name).first()
            if not layer_instance:
                data = LAYER_VALIDATORS[format](url, name)
                if not data:
                    continue

                data.update({
                    'collection': collection_instance,
                    'name': name,
                    # 'params': params,
                })
                layer_instance, created = Layer.objects.get_or_create(
                    collection=collection_instance,
                    name=name,
                    params=params,
                )
            if layer_instance:
                onboarded_layers.append(layer_instance.name)
        
        if set(layers.keys()) != set(onboarded_layers):
            raise Exception('Not all layers have been onboarded.')
            
        return collection_instance
    except Exception as e:
        print('onboard_collection error', e)

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        cache.delete(cacheKey)

        if not collection_instance:
            return
        
        if collection_instance.layers.count() > 0:
            return collection_instance
        
        collection_instance.delete()