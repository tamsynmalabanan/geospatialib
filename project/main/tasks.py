from django.core.cache import cache

from celery import shared_task
import requests

from .models import URL, Collection, Layer

# @shared_task
@shared_task(
    bind=True, 
    autoretry_for=(Exception,), 
    retry_backoff=0.5, 
    retry_kwargs={'max_retries':5}
)
def onboard_collection(self, cacheKey):
    try:
        cached_collection = cache.get(cacheKey)
        if not cached_collection:
            raise Exception('Cached collection not found.')
        
        url = cached_collection['url']
        url_instance = URL.objects.filter(path=url).first()
        if not url_instance:
            try:
                response = requests.head(url)
                status = response.status_code
                if  200 <= status < 300:
                    url_instance, created = URL.objects.get_or_create(path=url)
                else:
                    print(response)
                    raise Exception('Response not ok.')
            except Exception as e:
                raise e
        if not url_instance:
            raise Exception('No URL instance exists or created.')
        print(url_instance)

        format = cached_collection['format']
        collection_instance = Collection.objects.filter(url=url_instance, format=format)
        if not collection_instance:
            # validate collection: check if there are valid layers based on the format
            collection_instance, created = Collection.objects.get_or_create(url=url_instance, format=format)
        if not collection_instance:
            raise Exception('No Collection instance exists or created.')
        print(collection_instance)

        # for name, attrs in cached_collection['layers'].items():
        #     # get layer instance
        #     # if not layer instance, validate layer
        #     # if valid, create layer instance
        #     layer_instance, created = Layer.objects.get_or_create(
        #         collection=collection_instance,
        #         name=name,
        #         params=attrs,
        #     )
        #     # populate layer fields
        
        # cache.delete(cacheKey) # only delete if all layers have been created
    except Exception as e:
        print('onboard_collection error', e)
        self.retry() 