from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

from decouple import config

class Command(BaseCommand):
    help = 'setup_allauth_social_google'
    
    def handle(self, *args, **kwargs):
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

        self.stdout.write(self.style.SUCCESS('allauth social google setup done'))