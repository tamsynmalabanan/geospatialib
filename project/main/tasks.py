from django.core.cache import cache

from celery import shared_task
import requests

from .models import URL, Collection, Layer
from helpers.base.utils import get_domain, get_response, get_domain_url
from helpers.main.layers import LAYER_VALIDATORS, format_url

@shared_task(
    bind=True, 
    autoretry_for=(Exception,),
    retry_backoff=60, 
    max_retries=3,
)
def onboard_collection(self, cacheKey):
    cached_collection = cache.get(cacheKey)
    if not cached_collection:
        return

    url = cached_collection.get('url')
    format = cached_collection.get('format')
    layers = cached_collection.get('layers')

    collection_instance = None

    try:
        url_instance = URL.objects.filter(path=url).first()
        if not url_instance:
            response = get_response(
                url=format_url(url),
                header_only=True,
                raise_for_status=True,
            )
            if response and response.status_code != 404:
                url_instance, created = URL.objects.get_or_create(path=url)
            else:
                raise Exception('Invalid URL response.')
        if not url_instance:
            raise Exception('No URL instance exists or created.')

        collection_instance = Collection.objects.filter(url=url_instance, format=format).first()
        if not collection_instance:
            collection_instance, created = Collection.objects.get_or_create(
                url=url_instance, 
                format=format,
                names=list(layers.keys())
            )
        if not collection_instance:
            raise Exception('No Collection instance exists or created.')

        onboarded_layers = []
        for name, params in layers.items():
            data = LAYER_VALIDATORS[format](url, name, params)
            if not data:
                continue

            layer_instance = Layer.objects.filter(collection=collection_instance, name=name).first()
            if not layer_instance:
                layer_instance, created = Layer.objects.get_or_create(**{
                    'collection': collection_instance,
                    'name': name,
                    **data
                })
            else:
                layer_instance.update(**data)

            if layer_instance:
                onboarded_layers.append(layer_instance.name)
        
        if set(layers.keys()) != set(onboarded_layers):
            raise Exception('Not all layers have been onboarded.')
    except Exception as e:
        print('onboard_collection error', e)

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)

        if collection_instance and collection_instance.layers.count() == 0:
            collection_instance.delete()

    cache.delete(cacheKey)
    return collection_instance