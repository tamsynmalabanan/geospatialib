from __future__ import absolute_import
import os
from celery import Celery
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
celery_app = Celery('project')

celery_app.config_from_object('django.conf:settings', namespace='CELERY')
celery_app.autodiscover_tasks()#lambda: settings.INSTALLED_APPS)

# @celery_app.task(bind=True)
# def debug_Task(self):
#     print('Request: {0!r}'.format(self.request))