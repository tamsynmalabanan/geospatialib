from django.core.management.base import BaseCommand
import json
import os
from django.conf import settings

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):
    help = 'Onboard taginfo keys'
    def handle(self, *args, **kwargs):
        with open(os.path.join(
            settings.BASE_DIR,
            'data', 'all_taginfo_keys.json'
        ), 'r', encoding='utf-8') as file:
            data = json.load(file)['data']
            for i in data:
                try:
                    key_value = i.get('key', None)
                    if not key_value:
                        continue

                    in_wiki = i.get('in_wiki', False)
                    if not in_wiki:
                        continue

                    print(i)

                except Exception as e:
                    logger.error(f'{self.help}, {e}, {i}')

        self.stdout.write(self.style.SUCCESS('Done.'))