from django.core.management.base import BaseCommand
import json
import os

from helpers.base.utils import get_response
import urllib.parse

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):
    help = 'Onboard taginfo keys'
    min_count = 100

    def get_data(self, url, alt):
        try:
            response = get_response(url)
            if response:
                return response.json().get('data', alt)
        except Exception as e:
            logger.error(e)
        return alt
    
    def get_discardable_keys(self):
        data = self.get_data(f'https://taginfo.openstreetmap.org/api/4/keys/discardable?', [])
        return [i.get('key') for i in data]

    def get_valid_keys(self):
        discardable_keys = self.get_discardable_keys() + ['']
        data = self.get_data(f'https://taginfo.openstreetmap.org/api/4/keys/all?', [])
        return [
            i.get('key') for i in data
            if i.get('key') not in discardable_keys
            and i.get('count_all', 0) > self.min_count
            and i.get('values_all', 0) != 0
            and i.get('in_wiki') is True
        ]

    def get_tag_description(self, key, value):
        data = self.get_data(f'https://taginfo.openstreetmap.org/api/4/tag/overview?key={key}&value={value}', {})
        descriptions = data.get('description', {})
        if len(descriptions) > 0:
            return descriptions.get('en', descriptions.get(list(descriptions.keys())[0], {})).get('text', '').strip()
        return ''

    def get_key_overview(self, key):
        data = self.get_data(f'https://taginfo.openstreetmap.org/api/4/key/overview?key={key}', {})
        overview = {'prevalent_values': [i.get('value') for i in data.get('prevalent_values', [])]}
        descriptions = data.get('description', {})
        if len(descriptions) > 0:
            overview['description'] = descriptions.get('en', descriptions.get(list(descriptions.keys())[0], {})).get('text', '').strip()
        return overview

    def get_related_keys(self, key):
        data = self.get_data(f'https://taginfo.openstreetmap.org/api/4/key/combinations?key={key}', [])
        return [
            i.get('other_key') 
            for i in data
            if i.get('together_count', 0) > self.min_count
            and not any(j in i.get('other_key') for j in ['name', 'wiki'])
        ]

    def get_file_path(self):
        """
        Constructs the file path for the "osm_tags.txt" file, ensures the directory exists,
        and creates an empty file if it does not already exist.
        Returns:
            str: The absolute file path to the "osm_tags.txt" file.
        """
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "osm_tags.txt")

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as f:
                pass

        return file_path

    def handle(self, *args, **kwargs):
        file_path = self.get_file_path()
        keys = self.get_valid_keys()
        total_count = len(keys)
        count = 0

        with open(file_path, "r", encoding="utf-8") as f:
            line_count = sum(1 for _ in f)
            if line_count > 0:
                keys = keys[line_count:]
                count = line_count

        with open(file_path, "a", encoding="utf-8") as f:
            for key in keys:
                try:
                    count +=1
                    logger.info(f'{count}/{total_count}')
                    
                    key_overview = self.get_key_overview(key)
                    prevalent_values = key_overview.get('prevalent_values', [])
                    related_keys = self.get_related_keys(key)
                    keywords = [key] + prevalent_values + related_keys

                    data = {
                        'tag':f'["{key}"]', 
                        'description': key_overview.get('description', ''), 
                        'keywords': keywords,
                    }
                    f.write(json.dumps(data) + "\n")
                    logger.info(data.get('tag'))

                    for value in prevalent_values:
                        try:
                            data = {
                                'tag':f'["{key}"="{value}"]', 
                                'description': self.get_tag_description(key, value),
                                'keywords': keywords,
                            }
                            f.write(json.dumps(data) + "\n")
                            logger.info(data.get('tag'))
                        except Exception as e:
                            logger.error(e)
                except Exception as e:
                    logger.error(e)

        self.stdout.write(self.style.SUCCESS('Done.'))