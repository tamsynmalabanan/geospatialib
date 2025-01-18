from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
from django.db.models import Q

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        dataset_urls = models.Dataset.objects.values_list('url', flat=True)
        print(dataset_urls)

        self.stdout.write(self.style.SUCCESS('Test'))