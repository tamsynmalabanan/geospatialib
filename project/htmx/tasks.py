from celery import shared_task

@shared_task#(bind=True, autoretry_for=(Exception,), retry_backoff=0.5, retry_kwargs={'max_retries':5})
def test_task(value):
    print(value)
    return {
        'task': 'test_task',
        'value': value,
        'another variable': 'sdfcdsafsd'
    }