from django.core.management.base import BaseCommand
import json
import os

from helpers.base.utils import get_response

import logging
logger = logging.getLogger('django')

class Command(BaseCommand):
    help = 'Onboard taginfo keys'
    def handle(self, *args, **kwargs):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "data", "osm_tags.json")

        if os.path.exists(file_path):
            return
        
        try:
            response = get_response('https://taginfo.openstreetmap.org/api/4/keys/all?')
            if not response:
                return
            
            data = (response.json()).get('data', [])

            print('total keys: ', len(data))
            count = 0

            layers = {}

            for i in data:
                count +=1
                print(count)
                
                try:
                    key = i.get('key', '')
                    if not key or not key.strip():
                        raise Exception('Invalid key.')

                    in_wiki = i.get('in_wiki', False)
                    if not in_wiki:
                        raise Exception('No tag wiki.')
                    
                    count_all = i.get('count_all', 0)
                    if count_all < 1000:
                        raise Exception('Less than 1000 count.')

                    values_all = i.get('values_all', 0)
                    if values_all == 0:
                        raise Exception('No values.')

                    layers[f'"{key}"'] = [key]

                    response = get_response(f'https://taginfo.openstreetmap.org/api/4/key/prevalent_values?key={key}')
                    if not response:
                        raise Exception('No valid response for prevalent values.')

                    prevalent_values = [i for i in response.json().get('data', []) if i.get('value')]
                    keywords = [i.get('value', '').strip() for i in prevalent_values] + [key]
                    layers[f'"{key}"'] = keywords
                    
                    for j in prevalent_values[:20]:
                        try:
                            count = j.get('count', 0)
                            if count == 0:
                                raise Exception('Value count is zero.')

                            value = j.get('value', '')
                            if not value or not value.strip():
                                raise Exception('Invalid value.')

                            layers[f'"{key}"="{value}"'] = keywords
                        except Exception as e:
                            print(e)
                except Exception as e:
                    print(e)

            if layers:
                print('total keys: ', len(data))
                print('total layers', len(layers))
                with open(file_path, "w") as json_file:
                    json.dump(layers, json_file, indent=4)
        except Exception as e:
            print(e)

        self.stdout.write(self.style.SUCCESS('Done.'))