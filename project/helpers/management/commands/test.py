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
        }.get(name)

        if fn:
            return fn(**args)
        
        raise ValueError(f"Unknown function: {name}")


    class ParamsEvaluation(BaseModel):
        is_thematic_map: bool = Field(description='Whether prompt describes a valid subject for a thematic map.')
        confidence_score: float = Field(description='Confidence score between 0 and 1.')

    def params_eval_info(user_prompt:str) -> ParamsEvaluation:
        completion = client.beta.chat.completions.parse(
            model=model,
            messages=[
                {
                    'role':'system', 
                    'content':'''
                        Determine whether the user prompt describes a subject for a valid thematic map. A valid subject must:
                        - Clearly imply geographic or spatial distribution based on real-world attributes.
                        - Use quantifiable data with direct spatial applicability (e.g. environmental, infrastructural, demographic).
                        - Avoid abstract, speculative, or symbolic groupings not grounded in geographic reality (e.g. astrology, personality types).
                    '''
                },
                {'role':'user', 'content': user_prompt}
            ],
            response_format=ParamsEvaluation,
        )
        result = completion.choices[0].message.parsed
        return result
    

    class ParamsExtraction(BaseModel):
        place: str = Field(description='Name of a place of interest for the thematic map that is mentioned in the prompt, if any. Blank if none.')
        bbox: str = Field(description='Bounding box of the place of interest, if any. Blank if none.')
        categories: str = Field(description='''
            A JSON of 10 categories relevant to the subject and place of interest, if any, with 5 query words and 5 Overpass QL filter tags, formatted: {
                "category_id": {
                    "title": "Category Title",
                    "description": "A detailed description of the relevance of the category to the subject and place of interest, if any.",
                    "query": "('word1' | 'word2' | 'word3'...)",
                    "overpass": ["[tag_filter1]", "[tag_filter2]", "[tag_filter3]"... ]
                },...
            }
        ''')

    def extract_map_params(user_prompt:str) -> ParamsExtraction:
        messages = [
            {
                'role': 'system',
                'content': '''
                    1. If a place of interest is mentioned in the subject, extract its bounding box using 'get_place_bbox' tool.
                        - call 'get_place_bbox' only for this purpose and only once.
                    2. Identify 10 diverse and spatially-applicable categories that are most relevant to the subject.
                        - Prioritize categories that correspond to topography, environmental, infrastructure, regulatory, or domain-specific datasets.
                        - Focus on thematic scope and spatial context; do not list layers.
                        - Make sure there are 10 categories.
                    3. For each category, identify 5 query words most relevant to the category and subject.
                        - Each query word should be an individual real english word, without caps, conjunctions or special characters.
                        - Make sure query words are suitable for filtering geospatial layers.
                        - Make sure there are 5 query words.
                    4. For each category, identify 5 valid Overpass QL filter tags most relevant to the category and subject.
                        - Only include tags that exist in the OpenStreetMap tagging schema.
                        - Use only keys and values listed on the OpenStreetMap wiki or Taginfo.
                        - Exclude invented or uncommon tags not used in OpenStreetMap data.
                        - Validate tags against the Overpass QL specification and common usage.
                        - Return only tags that are supported by Overpass QL filters like [key=value], [key~(value1|value2)], or [key].
                        - Make sure there are 5 filter tags.
                    
                    Make sure categories JSON is formatted as a valid JSON string.
                '''
            },
            {'role': 'user', 'content': user_prompt}
        ]

        completion = client.beta.chat.completions.parse(
            model=model,
            messages=messages,
            tools=[
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
            ],
            response_format=ParamsExtraction
        )

        for tool_call in completion.choices[0].message.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            result = call_function(name, args)

            messages.append(completion.choices[0].message)
            messages.append(
                {'role': 'tool', 'tool_call_id': tool_call.id, 'content': json.dumps(result)}
            )

        completion = client.beta.chat.completions.parse(
            model=model,
            messages=messages,
            response_format=ParamsExtraction
        )

        result = completion.choices[0].message.parsed
        return result


    class ThematicMapParams(BaseModel):
        pass

    def create_thematic_map(user_prompt:str) -> Optional[ThematicMapParams]:
        init_eval = params_eval_info(user_prompt)
        print(init_eval)
        if not init_eval.is_thematic_map or init_eval.confidence_score < 0.7:
            return None
        
        params = extract_map_params(user_prompt)
        print('place', params.place)
        print('bbox', params.bbox)

        queryset = Layer.objects.all()
        if params.bbox:
            bbox = json.loads(params.bbox)
            w,s,e,n = [float(i) for i in bbox]
            geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
            queryset = queryset.filter(bbox__bboverlaps=geom)

        categories = json.loads(params.categories)
        for id, values in categories.items():
            categories[id]['layers'] = []
            
            search_query = SearchQuery(values.get('query'), search_type='raw')
            filtered_queryset = (
                queryset
                .annotate(rank=Max(SearchRank(F('search_vector'), search_query)))
                .filter(search_vector=search_query,rank__gte=0.001)
                .order_by(*['-rank'])
            )[:5]
            
            for layer in filtered_queryset:
                data = {
                    'name': layer.name,
                    'title': layer.title,
                    'abstract': layer.abstract,
                    'keywords': ', '.join(layer.keywords if layer.keywords else []) 
                }
                print(values.get('query'), data)
            


    user_prompt = "San Marcelino Zambales solar site screening"
    # user_prompt = "solar site screening"
    # user_prompt = "Favorite Ice Cream Flavors by Horoscope Sign"
    result = create_thematic_map(user_prompt)
    print(result)

class Command(BaseCommand):
    help = 'Test'
    def handle(self, *args, **kwargs):
        # URL.objects.all().delete()
        # test_get_collection_data()

        test_ai_agent()

        self.stdout.write(self.style.SUCCESS('Done.'))