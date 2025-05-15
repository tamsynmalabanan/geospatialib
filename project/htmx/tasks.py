from celery import shared_task

@shared_task
def test_task(value):
    print('test task', value)