from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Polygon
from django.contrib.gis.gdal import SpatialReference, CoordTransform

import json
import os
from django.conf import settings
import geojson

from helpers.base.utils import get_response, get_keywords_from_url
from main.models import Layer, Collection, SpatialRefSys, URL, SpatialRefSysExt
from helpers.main.constants import QUERY_BLACKLIST, WORLD_GEOM

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):

    def handle(self, *args, **kwargs):
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "spatial_references.geojson")
        if not file_path:
            return
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        data = json.loads(content)
        
        for feature in data.get('features', []):
            properties = feature['properties']
            
            auth, srid = properties['srid'].split(':')
            srid = int(srid)

            srs, created = SpatialRefSys.objects.get_or_create(srid=srid, defaults={
                'auth_name': auth,
                'auth_srid': srid,
                'srtext': properties['wkt'],
                'proj4text': properties['proj4text'],
            })
            
            save_srs = False
            if not srs.srtext and properties.get('wkt'):
                srs.srtext = properties.get('wkt')
                save_srs = True
            if not srs.proj4text and properties.get('proj4text'):
                srs.proj4text = properties.get('proj4text')
                save_srs = True
            if save_srs:
                srs.save()

            defaults = {k:v for k,v in properties.items() if k in [
                'srid', 
                'source', 
                'type',
                'name',
                'unit',
                'scope',
                'extent',
                'x_min',
                'y_min',
                'x_max',
                'y_max',
            ]}
            defaults['srs_id'] = srid

            geometry = feature['geometry']
            coordinates = geometry['coordinates']
            if len(coordinates) > 0:
                coords = coordinates[0] if geometry['type'] == 'Polygon' else coordinates[0][0]
                defaults['bbox'] = Polygon(coords)
                if any(not defaults.get(i) for i in ['x_min', 'y_min', 'x_max', 'y_max']):
                    try:
                        polygon = Polygon(coords)
                        transform = CoordTransform(SpatialReference(4326), SpatialReference(srid))
                        polygon.transform(transform)
                        x_min, y_min, x_max, y_max = list(polygon.extent)
                        defaults['x_min'] = x_min
                        defaults['y_min'] = y_min
                        defaults['x_max'] = x_max
                        defaults['y_max'] = y_max
                    except Exception as e:
                        logger.error(e)
                        logger.error(coords)

            srs_ext, created = SpatialRefSysExt.objects.get_or_create(srs__srid=srid, defaults=defaults)
            logger.info(srs_ext)

        self.stdout.write(self.style.SUCCESS('Done.'))