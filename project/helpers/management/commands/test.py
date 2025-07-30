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
    from django.contrib.postgres.search import SearchQuery, SearchRank
    from django.db.models import F, Max
    
    
    client = OpenAI(api_key=config('OPENAI_SECRET_KEY'))
    model = 'gpt-4o'

    class ParamsEvaluation(BaseModel):
        is_thematic_map: bool = Field(description='Whether prompt describes a valid subject for a thematic map.')
        confidence_score: float = Field(description='Confidence score between 0 and 1.')
        place: str = Field(description='Name of a place of interest for the thematic map that is mentioned in the prompt, if any. Blank if none.')
        title: str = Field(description='Title for the thematic map. Include the place of interest, if any.')

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
    

    class CategoriesExtraction(BaseModel):
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

    def extract_theme_categories(user_prompt:str) -> CategoriesExtraction:
        messages = [
            {
                'role': 'system',
                'content': '''
                    1. Identify 10 diverse and spatially-applicable categories that are most relevant to the subject.
                        - Prioritize categories that correspond to topography, environmental, infrastructure, regulatory, or domain-specific datasets.
                        - Focus on thematic scope and spatial context; do not list layers.
                        - Make sure there are 10 categories.
                    2. For each category, identify 5 query words most relevant to the category and subject.
                        - Each query word should be an individual real english word, without caps, conjunctions or special characters.
                        - Make sure query words are suitable for filtering geospatial layers.
                        - Make sure there are 5 query words.
                    3. For each category, identify 5 valid Overpass QL filter tags most relevant to the category and subject.
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
            response_format=CategoriesExtraction
        )
        result = completion.choices[0].message.parsed
        return result


    class LayersEvaluation(BaseModel):
        layers:str = Field(description='''
            A JSON of category ID and corresponding array of primary keys of layers that are relevant to the thematic map subject and respective category.
            Format: {"category1": ["layer_pk1", "layer_pk2", "layer_pk3",...]
        ''')

    def layers_eval_info(user_prompt:str, category_layers:dict) -> LayersEvaluation:
        completion = client.beta.chat.completions.parse(
            model=model,
            messages=[
                {
                    'role':'system', 
                    'content':'''
                        For each category in category layers, assess each layer in layers to determine whether the layer properties contain information that supports or enhances understanding of the 
                        current category within the specified thematic map subject. Assess relevance based only on:
                        - Semantic Alignment: Do the layer's name, title, abstract, or keywords conceptually relate to the category's focus?
                        - Analytical Utility: Would the layers's content contribute meaningful insights, classifications, or visualization under this category?

                        Filter out layers that are not relevant.
                        Make sure the response JSON is formatted as a valid JSON string.
                    '''
                },
                {
                    'role':'user', 
                    'content': f'''
                        thematic map subject: {user_prompt}
                        category layers:
                        {json.dumps(category_layers)}
                    '''
                }
            ],
            response_format=LayersEvaluation,
        )
        result = completion.choices[0].message.parsed
        return result
    

    def create_thematic_map(user_prompt:str):
        init_eval = params_eval_info(user_prompt)
        if not init_eval.is_thematic_map or init_eval.confidence_score < 0.7:
            return None
        
        title = init_eval.title
        place = init_eval.place
        bbox = []

        params = extract_theme_categories(user_prompt)
        categories = json.loads(params.categories)

        queryset = Layer.objects.all()
        if place:
            geolocator = Nominatim(user_agent="geospatialib/1.0")
            location = geolocator.geocode(place, exactly_one=True)
            if location:
                s,n,w,e = [float(i) for i in location.raw['boundingbox']]
                raw_geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
                geom_proj = raw_geom.transform(3857, clone=True)
                buffered_geom = geom_proj.buffer(1000)
                buffered_geom.transform(4326)

                bbox = buffered_geom.extent
                queryset = queryset.filter(bbox__bboverlaps=buffered_geom)

        category_layers = {}

        for id, values in categories.items():
            category_layers[id] = {'title': values.get('title')}
            search_query = SearchQuery(values.get('query'), search_type='raw')
            filtered_queryset = (
                queryset
                .annotate(rank=Max(SearchRank(F('search_vector'), search_query)))
                .filter(search_vector=search_query,rank__gte=0.001)
                .order_by(*['-rank'])
            )[:5]
            
            if filtered_queryset.exists():
                category_layers[id]['layers'] = {layer.pk: {
                    'name': layer.name,
                    'title': layer.title,
                    'abstract': layer.abstract,
                    'keywords': ', '.join(layer.keywords if layer.keywords else []),
                } for layer in filtered_queryset}
            
        params = layers_eval_info(user_prompt, category_layers)
        layers_eval = json.loads(params.layers)
        
        for id, layers in layers_eval.items():
            categories[id]['layers'] = [queryset.filter(pk=int(i)).first().data for i in layers]
            
        return {
            'title': title,
            'place': place,
            'bbox': bbox,
            'categories': categories
        }

    user_prompt = "San Marcelino Zambales solar site screening"
    # user_prompt = "solar site screening"
    # user_prompt = "Favorite Ice Cream Flavors by Horoscope Sign"
    params = create_thematic_map(user_prompt)
    # print('title: ', params['title'])
    # print('place: ', params['place'])
    # print('bbox: ', params['bbox'])
    
    # for id, values in params['categories'].items():
    #     print('category: ', id, values['title'])
    #     print('description: ', values['description'])
    #     print('query: ', values['query'])
    #     print('overpass: ', values['overpass'])
    #     print('layers: ', len(values.get('layers', [])))
    #     for data in values.get('layers', []):
    #         print(data['title'])

class Command(BaseCommand):
    help = 'Test'
    def handle(self, *args, **kwargs):
        # URL.objects.all().delete()
        # test_get_collection_data()

        test_ai_agent()

        self.stdout.write(self.style.SUCCESS('Done.'))