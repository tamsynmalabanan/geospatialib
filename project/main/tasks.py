from django.core.cache import cache

from celery import shared_task

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
            return None
        
        url_instance, created = URL.objects.get_or_create(path=cached_collection['url'])
        if not url_instance:
            return

        collection_instance, created = Collection.objects.get_or_create(
            url=url_instance,
            format=cached_collection['format']
        )
        if not collection_instance:
            return

        for name, title in cached_collection['names'].items():
            layer_instance, created = Layer.objects.get_or_create(
                collection=collection_instance,
                name=name,
                title=title,
            )
            # populate layer fields
        
        cache.delete(cacheKey)
    except Exception as e:
        print('onboard_collection error', e)
        self.retry() 