from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
from django.db.models import Q

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Test'))
        
        dataset_urls = list(set(models.Dataset.objects.values_list('url__url', flat=True)))
        with open('dataset_urls.txt', 'w') as file:
            for i in dataset_urls:
                file.write(i, '\n')
