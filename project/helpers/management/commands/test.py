from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_names
from helpers.gis.layers import get_collection_layers
from main.tasks import onboard_collection

import requests

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/zip.zip'
        url = 'https://raw.githubusercontent.com/tamsynmalabanan/gis-data/refs/heads/main/OpenStreetMap%20via%20Overpass%20(51).geojson'
        # value = get_collection_layers(url, delay=False)
        
        response = requests.head(url)  # Sends a HEAD request to check headers
        content_type = response.headers.get("Content-Type", "")
        print(response)
        print(content_type)

        if "geo+json" in content_type or "json" in content_type:
            print("The URL likely contains GeoJSON data.")
        else:
            print("The URL does not appear to contain GeoJSON.")
        
        
        # self.stdout.write(self.style.SUCCESS(value))