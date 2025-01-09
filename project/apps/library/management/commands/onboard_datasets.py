from django.core.management.base import BaseCommand

from apps.library import models

class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Onboard other datasets through URLS of existing datasets.'))

        urls = models.URL.objects.filter(datasets__isnull=False)

        for url in urls:
            print(url.id, url)
