from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.base.utils import get_response, get_response, split_by_special_characters
from helpers.base.files import get_file_names
from helpers.main.ogc import get_ogc_layers, get_layers_via_et
from helpers.main.collection import get_collection_data, get_layers, get_file_names, update_collection_data
from main.tasks import onboard_collection
from main.models import URL, Collection, Layer
from main.forms import ValidateCollectionForm
from htmx.agent import create_thematic_map

import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
import validators
import requests
import re
from urllib.parse import urlparse, urlunparse
from urllib.parse import unquote

import json
import os
from django.conf import settings
from main.models import TaginfoKey

class Command(BaseCommand):
    help = 'Onboard taginfo keys'
    def handle(self, *args, **kwargs):
        json_path = os.path.join(settings.BASE_DIR, 'data', 'all_taginfo_keys.json')

        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)['data']
            for i in data:
                try:
                    key, created = TaginfoKey.objects.get_or_create(key=i['key'])
                    key.count_all = i['count_all']
                    key.values_all = i['values_all']
                    key.in_wiki = i['in_wiki']
                    key.save()
                except Exception as e:
                    print(e)
                    print(i)

        self.stdout.write(self.style.SUCCESS('Done.'))