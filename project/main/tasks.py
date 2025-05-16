from django.core.cache import cache

from celery import shared_task

# @shared_task
@shared_task(
    bind=True, 
    autoretry_for=(Exception,), 
    retry_backoff=0.5, 
    retry_kwargs={'max_retries':5}
)
def onboard_collection(self, cacheKey):
    # onboard_collection should get cached collection variables and create collection and layers
    # when all layers are created, delete cached collection variables
    try:
        cached_collection = cache.get(cacheKey)
        if not cached_collection:
            return None
        
        return cached_collection
    except Exception as e:
        self.retry() 