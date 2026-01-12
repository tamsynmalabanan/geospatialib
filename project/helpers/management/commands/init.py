from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry

import os
import json

# from htmx.models import SRTMBoundingBox

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):
    help = 'Init'

    # def onboard_srtm_bbox(self):
    #     if not SRTMBoundingBox.objects.exists():
    #         logger.info('Onboarding SRTM bounding boxes...')

    #         path = os.path.join(
    #         os.path.dirname(os.path.abspath(__file__)), 
    #             "data/srtm30m_bounding_boxes", 
    #             "srtm30m_bounding_boxes.json"
    #         )
    #         with open(path, 'r') as f:
    #             data = json.load(f)

    #         for feature in data['features']:
    #             bbox = GEOSGeometry(json.dumps(feature['geometry']))
    #             dataFile = feature['properties'].get('dataFile')
    #             instance = SRTMBoundingBox.objects.create(dataFile=dataFile, bbox=bbox)
    #             logger.info(instance)
        
    #     logger.info('Onboarding SRTM bounding boxes complete.')

    def handle(self, *args, **kwargs):
        # self.onboard_srtm_bbox()
        self.stdout.write(self.style.SUCCESS('Init done.'))