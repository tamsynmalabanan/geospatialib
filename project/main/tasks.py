from django.core.cache import cache

from celery import shared_task
import requests

from .choices import COLLECTION_FORMATS
from .models import URL, Collection, Layer
from helpers.base.utils import get_domain, get_response, get_domain_url, create_cache_key
from helpers.main.layers import LAYER_VALIDATORS, format_url

@shared_task(
    bind=True, 
    autoretry_for=(Exception,),
    retry_backoff=60, 
    max_retries=3,
)
def onboard_collection(self, cache_key):
    cached_collection = cache.get(cache_key)
    if not cached_collection:
        return

    url = cached_collection.get('url')
    format = cached_collection.get('format')
    layers = cached_collection.get('layers')

    if COLLECTION_FORMATS.get(format) is None:
        return

    collection = None

    try:
        url_instance = URL.objects.filter(path=url).first()
        if not url_instance:
            is_ogc = format.startswith('ogc-')
            response = is_ogc or get_response(
                url=format_url(url, format),
                header_only=True,
                raise_for_status=False,
            )
            if is_ogc or response.status_code != 404:
                url_instance, created = URL.objects.get_or_create(path=url)
            else:
                raise Exception('Invalid URL response.')
        if not url_instance:
            raise Exception('No URL instance exists or created.')
  
        collection = Collection.objects.filter(url=url_instance, format=format).first()
        if not collection:
            collection, created = Collection.objects.get_or_create(
                url=url_instance, 
                format=format,
            )
        if not collection:
            raise Exception('No Collection instance exists or created.')

        onboarded_layers = []
        for name, params in layers.items():
            data = LAYER_VALIDATORS[format](url, name, params)
            if not data:
                continue

            layer_instance = Layer.objects.filter(collection=collection, name=name).first()
            if not layer_instance:
                layer_instance, created = Layer.objects.get_or_create(**{
                    'collection': collection,
                    'name': name,
                    **data
                })
            else:
                for field, value in data.items():
                    setattr(layer_instance, field, value)
                layer_instance.save()

            if layer_instance:
                onboarded_layers.append(layer_instance.name)
        
        if set(layers.keys()) != set(onboarded_layers):
            raise Exception('Not all layers have been onboarded.')
    except Exception as e:
        print('onboard_collection error', e)

        if self.request.retries < self.max_retries:
            cache.set(cache_key, cached_collection, timeout=60*15)
            raise self.retry(exc=e)

        if collection and collection.layers.count() == 0:
            collection.delete()

    cache.delete(cache_key)
    return collection