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


import xml.etree.ElementTree as ET
from owslib.wms import WebMapService
import validators
import requests
import re
from urllib.parse import urlparse, urlunparse
from urllib.parse import unquote




def test_get_collection_data():
    # url = 'https://dataworks.calderdale.gov.uk/download/ep46w/dc5/Special%20Protection%20and%20Conservation%20Areas%20GeoJson.geojson'
    # # url = 'https://raw.githubusercontent.com/tamsynmalabanan/gis-data/refs/heads/main/OpenStreetMap%20via%20Overpass%20(51).geojson'
    # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/zip.zip'
    # url = 'https://techgeo.org/wp-content/uploads/2024/10/World_Countries_Generalized_9029012925078512962.zip'
    # # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/centroid.zip'
    # url = 'https://nominatim.openstreetmap.org/reverse?lat=28.619166999999997&lon=77.4210995&zoom=18&format=geojson&polygon_geojson=1&polygon_threshold=0'
    # url = 'https://raw.githubusercontent.com/tamsynmalabanan/gis-data/refs/heads/main/centroid.csv'
    # # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/cinemas.zip'
    # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/Special%20Protection%20and%20Conservation%20Areas%20GeoJson.zip'
    # url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/Special%20Protection%20and%20Conservation%20Areas%20GeoJson.zip'
    # url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    # url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    # url = 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
    # url = 'https://services.ga.gov.au/gis/services/2023GHG_AcreageReleaseAreas/MapServer/WMSServer?request=GetCapabilities&service=WMS'
    # url = 'https://www.cmar.csiro.au/geoserver/wms?request=GetCapabilities'
    # url = 'https://ows.emodnet-bathymetry.eu/wms?request=GetCapabilities&service=WMS'
    # url = 'https://basemapserver.geoportal.gov.ph/tiles/v2/PGP/{z}/{x}/{y}.png'
    # url = 'http://88.99.52.155/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/%7Bz%7D/%7Bx%7D/%7By%7D.jpg'
    # url = 'https://wms.gebco.net/mapserv?request=getcapabilities&service=wms&version=1.3.0'
    # url = 'https://geoserver.geoportal.gov.ph/geoserver/wms?request=GetCapabilities&service=WMS'
    # url = 'https://services.ga.gov.au/gis/eggs/aus_chronostrat_v1/wms?request=GetCapabilities&service=WMS'
    url = 'https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/Special%20Protection%20and%20Conservation%20Areas%20GeoJson.zip'

    collection = Collection.objects.filter(url__path=url).first()
    if collection:
        collection.delete()

    data = get_collection_data(url, delay=False)
    print('layers count', len((data or {}).get('layers', {}).keys()))

def test_ai_agent():
    from openai import OpenAI
    from decouple import config
    from pydantic import BaseModel, Field
    from geopy.geocoders import Nominatim
    from django.contrib.gis.geos import Polygon, GEOSGeometry
    import json
    from main.models import Layer
    from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline
    from django.db.models import QuerySet, Count, Sum, F, IntegerField, Value, Q, Case, When, Max, TextField, CharField, FloatField
    from typing import Optional
    
    
    client = OpenAI(api_key=config('OPENAI_SECRET_KEY'))
    model = 'gpt-4o'

    def get_category_layers_data(categories_json, bbox_json=''):
        try:
            queryset = Layer.objects.all()
            if bbox_json:
                bbox = json.loads(bbox_json)
                w,s,e,n = [float(i) for i in bbox]
                geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
                queryset = queryset.filter(bbox__bboverlaps=geom)

            categories = json.loads(categories_json)
            for id, params in categories.items():
                query = params.get('query')
                search_query = SearchQuery(query, search_type='raw')
                filtered_queryset = (
                    queryset
                    .annotate(rank=Max(SearchRank(F('search_vector'), search_query)))
                    .filter(search_vector=search_query,rank__gte=0.025)
                    .order_by(*['-rank'])
                )
                categories[id]['layers'] = {layer.pk:{
                    'name': layer.name,
                    'title': layer.title,
                    'abstract': layer.abstract,
                    'keywords': ', '.join(layer.keywords) if layer.keywords else '' 
                } for layer in filtered_queryset[:5]}
            return categories
        except Exception as e:
            print(e)

    def get_place_bbox(place):
        try:
            geolocator = Nominatim(user_agent="geospatialib/1.0")
            location = geolocator.geocode(place, exactly_one=True)
            if location:
                s,n,w,e = [float(i) for i in location.raw['boundingbox']]
                geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
                geom_proj = geom.transform(3857, clone=True)
                buffered_geom = geom_proj.buffer(1000)
                buffered_geom.transform(4326)
                return buffered_geom.extent
        except Exception as e:
            print(e)

    def call_function(name, args):
        fn = {
            'get_place_bbox': get_place_bbox,
            'get_category_layers_data': get_category_layers_data,
        }.get(name)

        if fn:
            return fn(**args)
        
        raise ValueError(f"Unknown function: {name}")
    
    tools = [
        {
            'type': 'function',
            'function': {
                'name': 'get_place_bbox',
                'description': 'Returns the bounding box for a place in [w,s,e,n] format.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'place': {'type': 'string'}
                    },
                    'required': ['place'],
                    'additionalProperties': False
                },
                'strict': True,
            }
        },
        {
            'type': 'function',
            'function': {
                'name': 'get_category_layers_data',
                'description': 'Returns an updated categories JSON with a dictionary of database layers\' primary key and data for each category.',
                'parameters': {
                    'type': 'object',
                    'properties': {
                        'categories_json': {'type': 'string'},
                        'bbox_json': {'type': 'string'},
                    },
                    'required': ['categories_json', 'bbox_json'],
                    'additionalProperties': False
                },
                'strict': True,
            }
        },
    ]



    def call_ai_agent_v1():
        class ThematicMap(BaseModel):
            title: str = Field(
                description='The title of the thematic map. Incorporate the place of interest, if any.'
            )
            bbox: str = Field(
                description='The bounding box of the place of interest, if any.'
            )
            categories: str = Field(
                description='The JSON of categories and paramters including title, description, 5 query words, 10 overpass tags and 5 layers.'
            )

        system_prompt = '''
            You are a helpful thematic map creation assistant.

            The user will provide a subject they want to map, and optionally a place of interest. Your task is to:
            1. Determine whether the user's prompt is a valid subject for a thematic map. If not, respond that it is invalid.
            2. If prompt is valid:
                1. If a place is mentioned in the subject, use 'get_place_bbox' to identify the bounding box for the place. Format: [w,s,e,n].
                2. Identify 10 diverse spatially-applicable categories most relevant to the subject and to the place, if a place is mentioned.
                    - Prioritize categories that correspond to territorial boundary, natural resources, topography, environmental, infrastructure, regulatory, or domain-specific datasets.
                    - Be concise but informative in your reasoning. Avoid listing layers — focus on thematic scope and spatial context.
                3. Identify 5 search query words most relevant to each category ordered based on relevance to the category and subject.
                    - Each search query word should be an individual real english word, no caps, no conjunctions, no special characters, just a word relevant to the category.
                    - Make sure search query words are suitable for filtering geospatial layers.
                4. For each category, identify 10 Overpass QL filter tags that are relevant to the category ordered based on relevance to the category and subject.
                5. Create a JSON of categories and corresponding parameters i.e. title, query words, description and Overpass QL filter tags, in this format: {"category_id": {
                    "title": "Category Title 1", 
                    "description": "A detailed paragrapth describing the relevance of the category to the subject.",
                    "query": "(\'word1\' | \'word2\' | \'word3\')", 
                    "overpass_tags": ["tag1", "tag2", "tag3",...],
                }}
                6. If the categories in the JSON have no layers property yet, use 'get_category_layers_data' to update the categories JSON with a list of database layers data for each category. Updated format: {"category_id": {
                    "title": "Category Title 1", 
                    "description": "A detailed paragrapth describing the relevance of the category to the subject.",
                    "query": "(\'word1\' | \'word2\' | \'word3\')", 
                    "overpass_tags": ["tag1", "tag2", "tag3",...],
                    "layers": {layer1.pk:{
                        "name": "layer1.name",
                        "title": "layer1.title",
                        "abstract": "layer1.abstract",
                        "keywords": "layer1.keywords" 
                    },...},
                }}
        '''
        
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': 'solar plant site screening in palauig zambales'}
        ]

        completion = client.chat.completions.create(
            model='gpt-4o',
            messages=messages,
            tools=tools,
        )

        while completion.choices and completion.choices[0].finish_reason == 'tool_calls' and completion.choices[0].message.tool_calls:
            tool_calls = completion.choices[0].message.tool_calls
            print('tool_calls', tool_calls)
            for tool_call in completion.choices[0].message.tool_calls:
                name = tool_call.function.name
                print('tool name', name)
                args = json.loads(tool_call.function.arguments)
                messages.append(completion.choices[0].message)

                result = call_function(name, args)
                messages.append(
                    {'role': 'tool', 'tool_call_id': tool_call.id, 'content': json.dumps(result)}
                )

            completion = client.beta.chat.completions.parse(
                model='gpt-4o',
                messages=messages,
                tools=tools,
                response_format=ThematicMap
            )

        if completion.choices:
            content_json = completion.choices[0].message.content
            if content_json:
                content = json.loads(content_json)
                print('Title:', content.get('title'))
                print('Bbox:', content.get('bbox'))
                categories = content.get('categories')
                for key1, value1 in json.loads(categories).items():
                    print(key1)
                    for key2, value2 in value1.items():
                        print(key2, value2)

    # Steps:
    # 1. Confirm whether prompt is a valid thematic map subject - get subject, place, confidence
    # 2. Get place bbox and categories with id, title, query words
    # 3. Update categories with database layers
    # 4. Filter database layers in each category based on layer data
    # 5. Get title, bbox and categories with id, title, rationale, query words, overpass filter tags 

    def call_ai_agent_v2():
        class ParamsEvaluation(BaseModel):
            description: str = Field(description='Raw description of the thematic map.')
            is_thematic_map: bool = Field(description='Whether prompt describes a valid subject for a thematic map.')
            confidence_score: float = Field(description='Confidence score between 0 and 1.')
        
        class ThematicMapParams(BaseModel):
            pass

        def params_eval_info(user_prompt:str) -> ParamsEvaluation:
            completion = client.beta.chat.completions.parse(
                model=model,
                messages=[
                    {'role':'system', 'content':'Analyze if the user prompt is a valid subject for a thematic map.'},
                    {'role':'user', 'content': user_prompt}
                ],
                response_format=ParamsEvaluation,
            )
            result = completion.choices[0].message.parsed
            return result
        
        def create_thematic_map(user_prompt:str) -> Optional[ThematicMapParams]:
            init_eval = params_eval_info(user_prompt)
            print('init_eval', init_eval)

            if not init_eval.is_thematic_map or init_eval.confidence_score < 0.7:
                return None
            
            return init_eval

        user_prompt = "San Marcelino Zambales solar site screening"
        result = create_thematic_map(user_prompt)
        print(result)

class Command(BaseCommand):
    help = 'Test'
    def handle(self, *args, **kwargs):
        # URL.objects.all().delete()
        # test_get_collection_data()

        test_ai_agent()

        self.stdout.write(self.style.SUCCESS('Done.'))