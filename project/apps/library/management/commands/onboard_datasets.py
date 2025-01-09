from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Onboard other datasets through URLS of existing datasets.'))

        url_instances = (models.URL.objects
            .annotate(
                dataset_formats=ArrayAgg('datasets__format', distinct=True), 
                dataset_names=ArrayAgg('datasets__name', distinct=True),
            )
            .values(
                'url', 
                'dataset_formats', 
                'dataset_names', 
            )
            .filter(datasets__isnull=False)
            .distinct()
        )
        
        for url_instance in url_instances:
            url = ['url']
            dataset_formats = ['dataset_formats']
            dataset_names = ['dataset_names']

            print(url)

            for format in dataset_formats:
                print(format)

                handler = dataset_helpers.get_dataset_handler(
                    format, 
                    url=url,
                )

                print(handler)

            print('\n')

        print(url_instances.count())