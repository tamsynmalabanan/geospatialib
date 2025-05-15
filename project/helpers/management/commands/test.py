from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_info
from helpers.gis.layers import get_collection
from helpers.gis.tasks import onboard_collection

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        onboard_collection.delay('new task lined up while worker was down')
        self.stdout.write(self.style.SUCCESS('Test'))