from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_names
from helpers.gis.layers import get_collection_layers
from main.tasks import onboard_collection

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/zip.zip'
        value = get_collection_layers({
            'url': url
        }, delay=False)
        self.stdout.write(self.style.SUCCESS(value))