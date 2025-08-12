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
    
    def handle(self, *args, **kwargs):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "data", "osm_tags.json")

        if not os.path.exists(file_path):
            return
        
        overpass_url = 'https://overpass-api.de/api/interpreter'
        overpass_collection, _ = Collection.objects.get_or_create(
            url=URL.objects.get_or_create(path=overpass_url)[0],
            format='overpass',
        )
        srs = SpatialRefSys.objects.filter(srid=4326).first()
        keywords = get_keywords_from_url(overpass_url) + ['openstreetmap', 'osm']
        
        with open(file_path, "r") as json_file:
            data = json.load(json_file)
  
            for tag, keywords in data.items():
                layer, _ = Layer.objects.get_or_create(
                    collection=overpass_collection,
                    name=f'osm-{tag}',
                    defaults={
                        'type':'overpass',
                        'srid':srs,
                        'bbox':WORLD_GEOM,
                        'tags':tag,
                        'title':tag,
                        'attribution':'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.',
                        'keywords':keywords
                    }
                )

                print(layer)

        self.stdout.write(self.style.SUCCESS('Done.'))