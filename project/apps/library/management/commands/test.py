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
            tags = dataset.tags.values_list('tag', flat=True)
            if len(tags) > 10:
                valid_tags = []
                for tag in tags:
                    if len(tag) > 2 and tag not in ['wms', 'wfs', '-']:
                        valid_tags.append(tag)
                sorted_tags = sorted(valid_tags, key=len)
                new_tags = models.Tag.objects.filter(tag__in=sorted_tags[:10])
                dataset.tags.set(new_tags)
                print(dataset, dataset.tags.count())