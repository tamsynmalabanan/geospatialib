from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, Max

from main.models import Layer, Collection, URL, SpatialRefSys
from helpers.main.constants import QUERY_BLACKLIST, WORLD_GEOM
from helpers.base.utils import get_response, get_keywords_from_url, get_special_characters

from openai import OpenAI
from decouple import config
from pydantic import BaseModel, Field, ValidationError
from geopy.geocoders import Nominatim
import json
import re

import logging
logger = logging.getLogger('django')

CLIENT_MODEL = 'gpt-5-mini'

JSON_RESPONSE_PROMPT = '''
    Return only a raw JSON string with double quotes for all keys and string values.
    Use standard JSON formatting (e.g. no Python dict, no single quotes, no backslashes). 
    Do not wrap the output in triple quotes or additional characters.
    Make sure there are no trailing commas and to close all braces to avoid errors when loaded into json.loads().
'''

class ParamsEvaluation(BaseModel):
    is_thematic_map: bool = Field(description='Whether prompt describes a valid subject for a thematic map.')
    confidence_score: float = Field(description='Confidence score between 0 and 1.')
    title: str = Field(description='Title for the thematic map.')
    landmarks: str = Field(description='A JSON array string of the landmarks that are mentioned in the subject, following this format: ["Landmark 1", "Landmark 2", "Landmark 3"...]')

def params_eval_info(user_prompt:str, client:OpenAI) -> ParamsEvaluation:
    completion = client.beta.chat.completions.parse(
        model=CLIENT_MODEL,
        messages=[
            {
                'role':'system', 
                'content':'''
                    Determine whether the user prompt describes a subject for a valid thematic map. A valid subject must:
                        - Clearly imply geographic or spatial distribution based on real-world attributes.
                        - Use quantifiable data with direct spatial applicability (e.g. environmental, infrastructural, demographic).
                        - Avoid abstract, speculative, or symbolic groupings not grounded in geographic reality (e.g. astrology, personality types).

                    If the subject is valid, provide the following:
                        1. Title for the thematic map, including the place of interest if specified in the user prompt.
                        2. Landmarks or names of establishments that are mentioned in the subject:
                            - Only consider proper names that refer to specific branded or uniquely named establishments, e.g. "IKEA" or "KFC", excluding generic categories like "restaurant", "mall", or "government office".
                            - Exclude names of administrative places, e.g. "New York" or "Manila". Do not include country, city, or regional names—even if they appear alongside landmarks.
                            - Write the names as they are written in the subject, e.g. in the subject "locations of Jollibee branches in the Philippines", the landmarks should be ["Jollibee"] only, and not ["Jollibee", "Philippines"].
                            - Return each landmark only once, preserving the original casing and spelling as written in the subject.
                '''
            },
            {'role':'user', 'content': user_prompt}
        ],
        response_format=ParamsEvaluation,
    )

    result = completion.choices[0].message.parsed
    return result

def create_categories(user_prompt:str, client:OpenAI):
    messages = [
        {
            'role': 'system',
            'content': '''
                With the user prompt as the subject, identify five (5) diverse and spatially-applicable categories that are most relevant to the subject.
                    - Prioritize categories that correspond to topography, environmental, infrastructure, economic, social, regulatory, or domain-specific datasets.
                    - Focus on thematic scope and spatial context; do not list layers.
                    - For each category, provide an id, title, three (3) keywords, and a senstence describing its relevance to the subject.
                    - Each keyword should be a single English word; no phrases, conjunctions and special characters.

                Strictly follow this format for the response:
                {"category_id":{"title":"Category Title","keywords":["keyword1","keyword2","keyword3"],"description":"Description of the relevance of the category to the subject.",},...}
            ''' + '\n' + JSON_RESPONSE_PROMPT
        },
        {'role': 'user', 'content': user_prompt}
    ]

    completion = client.chat.completions.create(
        model=CLIENT_MODEL,
        messages=messages,
    )

    if completion.choices:
        content = completion.choices[0].message.content
        for i in [' ', '"', "'", '\n', '\r']:
            content = content.strip(i)
        content = re.sub(r'\s{2,}', ' ', content)
        content = content.replace('} }', '}}').replace('{ {', '{{')

        open_braces = content.count('{')
        close_braces = content.count('}')
        if close_braces < open_braces:
            content += '}' * (open_braces-close_braces)

        try:
            return json.loads(content)
        except Exception as e:
            logger.error(f'create_categories, {e}, {content}')

def layers_eval_info(user_prompt:str, category_layers:dict, client:OpenAI):
    completion = client.chat.completions.create(
        model=CLIENT_MODEL,
        messages=[
            {
                'role':'system', 
                'content':'''
                    For each category in category layers, assess each layer in layers to determine whether the layer properties contain information that supports or enhances understanding of the 
                    current category within the specified thematic map subject. Assess relevance based only on:
                    - Semantic Alignment: Do the layer's name, title, abstract, keywords or any other available properties conceptually relate to the category's focus?
                    - Analytical Utility: Would the layers's content contribute meaningful insights, classifications, or visualization under this category?

                    Remove layers that are not relevant to their respective categories and to the thematic map subject.

                    Strictly follow this format for the response:
                    {"category1":[layer_pk1, layer_pk2, layer_pk3,...],"category2":[layer_pk4, layer_pk5, layer_pk6,...],...}

                    Return only a raw JSON string with double quotes for all keys and string values.
                    Use standard JSON formatting (e.g. no Python dict, no single quotes, no backslashes). 
                    Do not wrap the output in triple quotes or additional characters.
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
    )

    if completion.choices:
        try:
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f'layers_eval_info, {e}')

def create_thematic_map(user_prompt:str, bbox:str):
    logger.info('create_thematic_map')

    try:
        client = OpenAI(api_key=config('OPENAI_SECRET_KEY'))

        init_eval = params_eval_info(user_prompt, client)
        logger.info(init_eval)
        if not init_eval.is_thematic_map or init_eval.confidence_score < 0.7:
            return {'is_invalid': 'This is not a valid subject for a thematic map. Please try again.'}

        categories = create_categories(user_prompt, client)
        logger.info(categories)
        if not categories:
            return None

        queryset = None
        try:
            w,s,e,n = json.loads(bbox)
            geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
            queryset = Layer.objects.filter(bbox__bboverlaps=geom)
        except Exception as e:
            queryset = Layer.objects.all()
        if not queryset or not queryset.exists():
            return None
        logger.info(queryset)

        try:
            landmarks = json.loads(init_eval.landmarks)
            if len(landmarks) > 0:
                tag_keys = ['name', 'name:en', 'brand', 'brand:en']
                overpass_collection = Collection.objects.filter(format='overpass').first()
                srs = SpatialRefSys.objects.filter(srid=4326).first()
                keywords = get_keywords_from_url('https://overpass-api.de/api/interpreter') + ['openstreetmap', 'osm']
                
                for landmark in landmarks:
                    categories = {f'landmarks-{landmark}': {
                        'title': f'{landmark} landmarks',
                        'keywords': [landmark]
                    }} | categories

                    clean_landmark = landmark.lower()
                    for i in get_special_characters(clean_landmark):
                        clean_landmark = clean_landmark.replace(i, ' ')

                    matched_layers = queryset.filter(tags__in=[f'["{key}"~".*{clean_landmark}.*",i]' for key in tag_keys]).values_list('tags', flat=True)
                    if len(matched_layers) > 0:
                        continue
                    
                    url = f'https://taginfo.openstreetmap.org/api/4/search/by_value?query={clean_landmark}'
                    logger.info(url)
                    response = get_response(
                        url=url,
                        header_only=False,
                        with_default_headers=False,
                        raise_for_status=True
                    )
                    logger.info(response)
                    
                    if not response:
                        continue
                
                    landmark_keys = [
                        i[0] for i in sorted({
                            i.get('key', ''): i.get('count_all', 0) 
                            for i in response.json().get('data', []) 
                            if i.get('count_all', 0) > 1
                        }.items(),
                        key=lambda x: x[1], reverse=True)
                    ]
                    landmark_keys = list([i for i in tag_keys if i in landmark_keys] + [i for i in landmark_keys if i not in tag_keys])[:5]
                    
                    for key in landmark_keys:
                        tag = f'["{key}"~".*{clean_landmark}.*",i]'
                        layer, _ = Layer.objects.get_or_create(
                            collection=overpass_collection,
                            name=tag,
                            defaults={
                                'type':'overpass',
                                'srid':srs,
                                'bbox':WORLD_GEOM,
                                'tags':tag,
                                'title':tag,
                                'attribution':'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.',
                                'keywords':keywords
                            }
                        )   
        except Exception as e:
            pass

        for id, values in categories.items():
            query = [i for i in values.get('keywords',[]) if i not in QUERY_BLACKLIST]

            filtered_queryset = (
                queryset
                .filter(search_vector=SearchQuery(
                    f'({' | '.join(query)})', 
                    search_type='raw'
                ))
                .annotate(rank=Max(SearchRank(F('search_vector'), SearchQuery(
                    ' OR '.join(query), 
                    search_type='websearch'
                ))))
                .order_by(*['-rank'])
            )

            if filtered_queryset.exists():
                categories[id]['layers'] = {
                    layer.pk: layer.data 
                    for layer in filtered_queryset[:5]
                }

        categories = {id: params for id, params in categories.items() if len(list(params['layers'].keys())) > 0}

        return {
            'subject': user_prompt,
            'bbox': bbox,
            'title': init_eval.title,
            'categories': categories
        }
    except Exception as e:
        logger.error(f'create_thematic_map, {e}')