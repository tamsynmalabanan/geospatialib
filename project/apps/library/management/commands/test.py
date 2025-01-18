from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
from django.db.models import Q

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Test'))
        
        url_instances = (models.URL.objects
            .annotate(
                formats=ArrayAgg('datasets__format', distinct=True), 
                names=ArrayAgg('datasets__name', distinct=True),
            )
            .values_list(
                'id', 
                'url', 
                'formats', 
                'names', 
            )
            .filter(datasets__isnull=False)
            .distinct()
        )

        with open('dataset_urls.csv', 'w') as file:
            for i in url_instances:
                file.write(f'{i[1]},{' '.join(i[2])}\n')

        with open('dataset_urls.csv', 'r') as file:
            for url in file:
                print(url, end='')