from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Onboard other datasets through URLS of existing datasets.'

    def handle(self, *args, **kwargs):
        while True:
            self.stdout.write(self.style.SUCCESS('Onboard other datasets through URLS of existing datasets.'))
