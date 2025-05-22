from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.base.files import get_file_names
from helpers.main.layers import get_collection_layers, get_layers, get_file_names
from main.tasks import onboard_collection

import requests

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/centroid.zip'
        # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/zip.zip'
        # url = 'https://raw.githubusercontent.com/tamsynmalabanan/gis-data/refs/heads/main/OpenStreetMap%20via%20Overpass%20(51).geojson'
        # url = 'https://raw.githubusercontent.com/tamsynmalabanan/gis-data/refs/heads/main/centroid.csv'
        # url = 'https://nominatim.openstreetmap.org/reverse?lat=28.619166999999997&lon=77.4210995&zoom=18&format=geojson&polygon_geojson=1&polygon_threshold=0'
        value = get_collection_layers(url, delay=False)
        self.stdout.write(self.style.SUCCESS(value))