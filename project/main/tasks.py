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
    try:
        return {
            'task': 'test_task',
            'another variable': 'sdfcdsafsd'
        }
    except Exception as e:
        self.retry() 