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

    def get_discardable_keys(self):
        response = get_response(f'https://taginfo.openstreetmap.org/api/4/keys/discardable?')
        if response:
            return [i.get('key') for i in response.json().get('data', [])]
        return []

    def get_valid_keys(self):
        response = get_response(f'https://taginfo.openstreetmap.org/api/4/keys/all?')
        if response:
            discardable_keys = self.get_discardable_keys() + ['']
            return [
                i.get('key') for i in response.json().get('data', [])
                if i.get('key') not in discardable_keys
                and i.get('count_all', 0) > self.min_count
                and i.get('values_all', 0) != 0
                and i.get('in_wiki') is True
            ]
        return []

    def get_tag_description(self, key, value):
        response = get_response(f'https://taginfo.openstreetmap.org/api/4/tag/overview?key={key}&value={value}')
        if response:
            descriptions = response.json().get('data', {}).get('description', {})
            if len(descriptions) > 0:
                return descriptions.get('en', descriptions.get(list(descriptions.keys())[0], {})).get('text', '').strip()
        return ''

    def get_key_overview(self, key):
        response = get_response(f'https://taginfo.openstreetmap.org/api/4/key/overview?key={key}')
        if response:
            data = response.json().get('data', {})
            overview = {'prevalent_values': [i.get('value') for i in data.get('prevalent_values')]}

            descriptions = data.get('description', {})
            if len(descriptions) > 0:
                overview['description'] = descriptions.get('en', descriptions.get(list(descriptions.keys())[0], {})).get('text', '').strip()

            return overview
        return {}    

    def get_related_keys(self, key):
        response = get_response(f'https://taginfo.openstreetmap.org/api/4/key/combinations?key={key}')
        if response:
            return [
                i.get('other_key') 
                for i in response.json().get('data', [])
                if i.get('together_count', 0) > self.min_count
                and not any(j in i.get('other_key') for j in ['name', 'wiki'])
            ]
        return []

    def handle(self, *args, **kwargs):
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "osm_tags.json")
        # if os.path.exists(file_path):
        #     return
        
        try:
            keys = self.get_valid_keys()
            total_count = len(keys)

            count = 0
            layers = []

            for key in keys:
                count +=1
                logger.info(f'{count}/{total_count}')
                
                key_overview = self.get_key_overview(key)
                prevalent_values = key_overview.get('prevalent_values')
                related_keys = self.get_related_keys(key)
                keywords = [key] + prevalent_values + related_keys

                key_data = {
                    'tag':f'["{key}"]', 
                    'description': key_overview.get('description', ''), 
                    'keywords': keywords,
                }
                layers.append(key_data)
                logger.info(key_data)

                for value in prevalent_values:
                    value_data = {
                        'tag':f'["{key}"="{value}"]', 
                        'description': self.get_tag_description(key, value),
                        'keywords': keywords,
                    }
                    layers.append(value_data)
                    logger.info(value_data)

            if layers:
                logger.info(f'total layers: {len(layers)}')
                with open(file_path, "w") as json_file:
                    json.dump(layers, json_file, indent=4)
        except Exception as e:
            print(e)

        self.stdout.write(self.style.SUCCESS('Done.'))