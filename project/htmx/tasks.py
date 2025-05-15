from celery import shared_task

@shared_task
def test_task(value):
    return {
        'task': 'test_task',
        'value': value
    }