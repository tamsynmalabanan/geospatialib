from celery import shared_task

@shared_task
def test_task(value):
    print(value)
    return {
        'task': 'test_task',
        'value': value,
        'another variable': 'sdfcdsafsd'
    }