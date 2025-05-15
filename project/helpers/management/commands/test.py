from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_info
from helpers.gis.layers import get_collection

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        get_collection('https://nominatim.openstreetmap.org/reverse?lat=28.619166999999997&lon=77.4210995&zoom=18&format=geojson&polygon_geojson=1&polygon_threshold=0', 'geojson')
        self.stdout.write(self.style.SUCCESS('Test'))