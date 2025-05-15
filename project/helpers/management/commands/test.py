from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_info
from helpers.gis.layers import get_collection

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        get_collection('https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/zip.zip')
        self.stdout.write(self.style.SUCCESS('Test'))