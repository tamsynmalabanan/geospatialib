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

    def is_number(self, value):
        try:
            return int(value)
        except Exception as e:
            return False

    def handle(self, *args, **kwargs):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "data", "osm_tags.txt")
        if not os.path.exists(file_path):
            return
        
        overpass_collection, _ = Collection.objects.get_or_create(
            url=URL.objects.get_or_create(path='https://overpass-api.de/api/interpreter')[0],
            format='overpass',
        )
        srs = SpatialRefSys.objects.filter(srid=4326).first()
        keywords = ['openstreetmap', 'osm']

        existing_layers = Layer.objects.filter(collection=overpass_collection)
        # existing_tags = existing_tags.values_list('tags', flat=True)
        
        existing_layers.delete()
        existing_tags = []
        count = 0

        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                tag = data.get('tag')

                if tag is None or tag in existing_tags:
                    continue

                if '=' in tag and self.is_number(tag.split('="')[-1].split('"')[0]):
                    logger.info(f'skipped: {tag}')
                    continue
                
                layer, _ = Layer.objects.get_or_create(
                    collection= overpass_collection,
                    name= tag,
                    defaults= {
                        'type': 'overpass',
                        'srid': srs,
                        'bbox': WORLD_GEOM,
                        'tags': tag,
                        'title': tag,
                        'abstract': data.get('description', ''),
                        'attribution': 'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.',
                        'keywords': keywords + [i for i in data.get('keywords', []) if not self.is_number(i) and len(i) > 2]
                    }
                )

                count += 1
                logger.info(f'{count}: {layer}')

        self.stdout.write(self.style.SUCCESS('Done.'))