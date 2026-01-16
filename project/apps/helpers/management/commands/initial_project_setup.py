from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from django.contrib.gis.geos import Polygon
from django.contrib.gis.gdal import SpatialReference, CoordTransform

from allauth.socialaccount.models import SocialApp
from decouple import config
import os
import json

from apps.customuser.models import User
from apps.helpers.models import SpatialRefSys, SpatialRefSysExt

import logging
logger = logging.getLogger('django')


class Command(BaseCommand):
    help = 'Initial project setup'

    def create_admin(self):
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                email=config('ADMIN_EMAIL'),
                username=config('ADMIN_USERNAME'),
                password=config('ADMIN_PASSWORD'),
            )

    def config_allauth_social(self):
        site = Site.objects.get(id=1)
        site.domain = config('HOST_DOMAIN')
        site.name = config('HOST_DOMAIN')
        site.save()

        app, created = SocialApp.objects.get_or_create(
            provider='google',
            name=config('HOST_DOMAIN'),
            client_id=config('GOOGLE_OAUTH_CLIENT_ID'),
            secret=config('GOOGLE_OAUTH_SECRET'),
        )
        
        if created:
            app.sites.add(site)

        self.stdout.write(self.style.SUCCESS('Allauth social configured.'))
    
    def populate_srs_models(self, *args, **kwargs):
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

        self.stdout.write(self.style.SUCCESS('Spatial reference models populated.'))

    def handle(self, *args, **kwargs):
        self.create_admin()
        self.config_allauth_social()
        self.populate_srs_models()

        self.stdout.write(self.style.SUCCESS('Initial project setup complete.'))