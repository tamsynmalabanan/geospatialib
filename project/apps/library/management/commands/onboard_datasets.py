from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers
from django.db.models import Q

class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        while True:
            self.stdout.write(self.style.SUCCESS('Onboarding datasets...'))
            
            # delete datasets in db with null or blank title fields
            invalid_datasets_instances = models.Dataset.objects.filter(Q(title__isnull=True) | Q(title=''))
            invalid_datasets_instances.delete()
            
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

            
            
            for url_instance in url_instances:
                id, url, formats, names = url_instance

                print(f'URL: {url}')

                for format in formats:
                    print(f'FORMAT: {format}')

                    try:
                        handler = dataset_helpers.get_dataset_handler(
                            format, 
                            url=url,
                        )

                        layers = list(handler.layers.keys())
                        new_layers = [layer for layer in layers if layer not in names]

                        for layer in new_layers:
                            print(f'NEW LAYER: {layer}')

                            response = True
                            if isinstance(handler, dataset_helpers.OGCHandlers):
                                print('TESTING CONNECTION...')
                                response = handler.test_connection(layer)

                            if response:
                                dataset_instance, created = models.Dataset.objects.get_or_create(
                                    url_id=id,
                                    format=format,
                                    name=layer
                                )
                                if dataset_instance and created:
                                    try:
                                        handler.populate_dataset(dataset_instance)
                                        print(f'SUCCESSFUL DATASET ONBOARDING!')
                                    except Exception as e:
                                        dataset_instance.delete()
                                        print(f'FAILED TO ONBOARD DATASET: {e}')
                                else:
                                    print(f'DATASET INSTANCE NOT CREATED: {dataset_instance} {created}')
                            else:
                                print(f'TEST CONNECTION FAILED')
                    except Exception as e:
                        print(f'FAILED TO RETRIEVE LAYERS: {e}')

                print('\n')