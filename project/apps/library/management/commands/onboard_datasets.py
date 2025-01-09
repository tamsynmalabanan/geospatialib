from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from apps.library import models
from utils.gis import dataset_helpers

class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        while True:
            self.stdout.write(self.style.SUCCESS('Onboard other datasets through URLS of existing datasets.'))
            
            url_instances = (models.URL.objects
                .annotate(
                    formats=ArrayAgg('datasets__format', distinct=True), 
                    names=ArrayAgg('datasets__name', distinct=True),
                )
                .values(
                    'id', 
                    'url', 
                    'formats', 
                    'names', 
                )
                .filter(datasets__isnull=False)
                .distinct()
            )
            
            new_datasets = 0

            for url_instance in url_instances:
                id = url_instance['id']
                url = url_instance['url']
                formats = url_instance['formats']
                names = url_instance['names']

                print(f'URL: {url}')
                print(f'EXISTING LAYERS: {names}')

                for format in formats:
                    print(f'FORMAT: {format}')

                    try:
                        handler = dataset_helpers.get_dataset_handler(
                            format, 
                            url=url,
                        )
                        layers = list(handler.layers.keys())
                        print(f'LAYERS: {layers}')

                        new_layers = [layer for layer in layers if layer not in names]
                        print(f'LAYERS TO ONBOARD: {new_layers}')

                        for layer in new_layers:
                            print(f'NEW LAYER: {layer}')
                            dataset_instance, created = models.Dataset.objects.get_or_create(
                                url_id=id,
                                format=format,
                                name=layer
                            )
                            if dataset_instance and created:
                                try:
                                    handler.populate_dataset(dataset_instance)
                                    new_datasets +=1
                                    print(f'SUCCESSFUL DATASET ONBOARDING!')
                                except Exception as e:
                                    dataset_instance.delete()
                                    print(f'FAILED TO CREATE DATASET: {e}')
                    except Exception as e:
                        print(f'FAILED TO RETRIEVE LAYERS: {e}')

                print('\n')

            print(f'TOTAL URLS: {url_instances.count()}')
            print(f'NEW DATASETS: {new_datasets}')
            print(f'TOTAL DATASETS: {models.Dataset.objects.count()}')