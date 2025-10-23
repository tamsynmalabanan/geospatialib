from django.core.management.base import BaseCommand
import json
import os
from django.conf import settings

from helpers.base.utils import get_response, get_keywords_from_url
from main.models import Layer, Collection, SpatialRefSys, URL
from helpers.main.constants import QUERY_BLACKLIST, WORLD_GEOM

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):
    help = 'Onboard taginfo keys'

    def add_arguments(self, parser):
        # Positional argument
        # parser.add_argument('name', type=str, help='Name to greet')

        # Optional argument
        parser.add_argument('--overwrite', type=bool, default=False, help='Overwrite all overpass layers.')

    def get_file_path(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "data", "osm_tags.txt")
        if not os.path.exists(file_path):
            return
        return file_path

    def handle(self, *args, **kwargs):
        overwrite = kwargs['overwrite']

        file_path = self.get_file_path()
        if not file_path:
            return
        
        overpass_collection, _ = Collection.objects.get_or_create(
            url=URL.objects.get_or_create(path='https://overpass-api.de/api/interpreter')[0], 
            format='overpass'
        )
        srs = SpatialRefSys.objects.filter(srid=4326).first()

        existing_layers = Layer.objects.filter(collection=overpass_collection)
        existing_tags = []
        count = 0

        if overwrite:
            existing_layers.delete()
        else:
            existing_tags = existing_layers.values_list('tags', flat=True)
            count = len(existing_tags)

        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line.strip())
                tag = data.get('tag')

                if tag is None:
                    continue

                if tag in existing_tags:
                    continue

                layer, created = Layer.objects.get_or_create(
                    collection = overpass_collection,
                    name = tag,
                    defaults = {
                        'type': 'overpass',
                        'srid': srs,
                        'bbox': WORLD_GEOM,
                        'tags': tag,
                        'title': tag,
                        'abstract': data.get('description', ''),
                        'attribution': 'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.',
                        'keywords': data.get('keywords', [])
                    }
                )

                count += 1
                logger.info(f'{count}: {layer}')

        self.stdout.write(self.style.SUCCESS('Done.'))