from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
from django.db.models import Q

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Test'))
        
        datasets = models.Dataset.objects.all()

        for dataset in datasets:
            tags = dataset.tags.values_list('tag')
            if len(tags) > 10:
                sorted_tags = sorted(tags, key=len)
                print(dataset, sorted_tags[:10])