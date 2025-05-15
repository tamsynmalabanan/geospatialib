from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.general.files import get_file_info
from helpers.gis.layers import get_collection
from htmx.tasks import test_task

class Command(BaseCommand):
    help = 'Test'

    def handle(self, *args, **kwargs):
        result = test_task.delay('sdgfdsg')
        self.stdout.write(self.style.SUCCESS('Test'))