from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models

class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Onboard other datasets through URLS of existing datasets.'))

        urls = (models.URL.objects
            .prefetch_related('datasets')
            .annotate(
                dataset_formats=ArrayAgg('datasets__format'),
                dataset_names=ArrayAgg('datasets__name'), 
            )
            .values(
                'url',
                'dataset_formats',
                'dataset_names',
            )
            .filter(datasets__isnull=False)
            .distinct('id')
        )

        for url in urls:
            print(url)

        print(urls.count())