from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, Max

from main.models import Layer, TaginfoKey, Collection, URL, SpatialRefSys
from helpers.main.constants import QUERY_BLACKLIST, WORLD_GEOM
from helpers.base.utils import get_response, get_keywords_from_url

from openai import OpenAI
from decouple import config
from pydantic import BaseModel, Field
from geopy.geocoders import Nominatim
import json



JSON_PROMPT_GUIDE = '''
    Return only the raw JSON string with double quotes for all keys and string values. 
    Use standard JSON formatting (e.g. no Python dict, no single quotes, no backslashes). 
    Do not wrap the output in triple quotes or additional characters.
'''

class ParamsEvaluation(BaseModel):
    is_thematic_map: bool = Field(description='Whether prompt describes a valid subject for a thematic map.')
    confidence_score: float = Field(description='Confidence score between 0 and 1.')
    title: str = Field(description='Title for the thematic map.')

def params_eval_info(user_prompt:str, client:OpenAI, model:str='gpt-4o') -> ParamsEvaluation:
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
    landmarks: str = Field(description='''
        A JSON array of the names of establishments or landmarks that are mentioned in the subject, following this format: ["Landmark 1", "Landmark 2", "Landmark 3"...]
            - Only consider proper names that refer to specific branded or uniquely named establishments, e.g. "IKEA" or "KFC", excluding generic categories like "restaurant", "mall", or "government office".
            - Excludes names of geographic places, e.g. "New York" or "Manila". Do not include country, city, or regional names—even if they appear alongside landmarks.
            - Write the names as they are written in the subject, e.g. in the subject "locations of Jollibee branches in the Philippines", the landmarks should be ["Jollibee"] only, and not ["Jollibee", "Philippines"].
            - Return each landmark only once, preserving the original casing and spelling as written in the subject.
    ''')
    categories: str = Field(description='''
        A JSON of 5 categories relevant to the subject with 5 query words and 5 Overpass QL tag keys and list of relevant values, following this format: {
            "category_id": {
                "title": "Category Title",
                "description": "Three (3) sentences describing the relevance of the category to the subject.",
                "query": "word1 word2 word3...",
                "overpass": {
                    "tag_key1": ["tag_value1", "tag_value2"...],
                    "tag_key2": ["tag_value1", "tag_value2"...],
                    "tag_key3": ["tag_value1", "tag_value2"...],
                    ...
                },
            },...
        }
    ''' + '\n' + JSON_PROMPT_GUIDE)

def extract_theme_categories(user_prompt:str, client:OpenAI, model:str='gpt-4o') -> CategoriesExtraction:
    messages = [
        {
            'role': 'system',
            'content': '''
                1. Identify 5 diverse and spatially-applicable categories that are most relevant to the subject.
                    - Prioritize categories that correspond to topography, environmental, infrastructure, regulatory, or domain-specific datasets.
                    - Focus on thematic scope and spatial context; do not list layers.
                    - You must include **exactly 5 categories**.
                2. For each category, identify 5 query words most relevant to the category and subject.
                    - Each query word should be an individual real english word, without caps, conjunctions or special characters.
                    - Make sure query words are suitable for filtering geospatial layers.
                    - You must include **exactly 5 words** for each category—**no fewer, no more**.
                3. For each category, identify 5 valid Overpass QL tag keys most relevant to the category and subject.
                    - Each key must have at least one value that is relevent to the category and subject.
                    - Tags must be valid OpenStreetMap tags supported by Overpass QL, using format.
                    - Use only tags listed on the OpenStreetMap wiki or Taginfo; exclude invented or rare tags.
                    - You must include **exactly 5 tags** for each category—**no fewer, no more**.
            ''' + '\n' + JSON_PROMPT_GUIDE
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
        A JSON of category ID and corresponding array of primary keys (integers) of layers that are relevant to the category and the thematic map subject.
        Format: {"category1": [layer_pk1, layer_pk2, layer_pk3,...], "category2": [layer_pk4, layer_pk5, layer_pk6,...],...}
    ''' + '\n' + JSON_PROMPT_GUIDE)

def layers_eval_info(user_prompt:str, category_layers:dict, client:OpenAI, model:str='gpt-4o') -> LayersEvaluation:
    completion = client.beta.chat.completions.parse(
        model=model,
        messages=[
            {
                'role':'system', 
                'content':'''
                    For each category in category layers, assess each layer in layers to determine whether the layer properties contain information that supports or enhances understanding of the 
                    current category within the specified thematic map subject. Assess relevance based only on:
                    - Semantic Alignment: Do the layer's name, title, abstract, keywords or any other available properties conceptually relate to the category's focus?
                    - Analytical Utility: Would the layers's content contribute meaningful insights, classifications, or visualization under this category?

                    Remove layers that are not relevant to their respective categories and to the thematic map subject.
                ''' + '\n' + JSON_PROMPT_GUIDE
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

def create_thematic_map(user_prompt:str, bbox:str):
    try:
        client = OpenAI(api_key=config('OPENAI_SECRET_KEY'))

        init_eval = params_eval_info(user_prompt, client)

        if not init_eval.is_thematic_map or init_eval.confidence_score < 0.7:
            return None
        
        params = extract_theme_categories(user_prompt, client)
        try:
            categories = json.loads(params.categories)
        except Exception as e:
            print(e)
            return None

        try:
            w,s,e,n = json.loads(bbox)
            geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)
            queryset = Layer.objects.filter(bbox__bboverlaps=geom)
        except Exception as e:
            print(e)
            queryset = Layer.objects.all()

        try:
            landmarks = json.loads(params.landmarks)
            if len(landmarks) > 0:
                name_keys = ['name', 'name:en']

                categories = {'landmarks': {
                    'title': 'Landmarks',
                    'query': ' '.join(landmarks),
                    'overpass': {key:[] for key in name_keys},
                }} | categories

                for i in landmarks:
                    tag_value = f'.*{i}.*'
                    tags = [f'{key}~{tag_value},i' for key in name_keys]
                    layer_tags = queryset.filter(tags__in=tags).values_list('tags', flat=True)

                    if layer_tags.count() == len(name_keys):
                        keys = name_keys
                        return 1, keys
                    else:
                        return 2, i
                        response = get_response(
                            url=f'https://taginfo.openstreetmap.org/api/4/search/by_value?query={i}',
                            header_only=False,
                            with_default_headers=False,
                            raise_for_status=True
                        )
                        
                        if not response:
                            continue
                    
                        keys = set([i.get('key') for i in response.json().get('data', [])])
                    
                    for key in name_keys:
                        if key in keys:
                            categories['landmarks']['overpass'][key].append(tag_value)     
        except Exception as e:
            print(e)

        overpass_url = 'https://overpass-api.de/api/interpreter'
        overpass_collection, _ = Collection.objects.get_or_create(
            url=URL.objects.get_or_create(path=overpass_url)[0],
            format='overpass',
        )
        srs = SpatialRefSys.objects.filter(srid=4326).first()

        category_layers = {}
        for id, values in categories.items():
            is_landmarks = id == 'landmarks'
            categories[id]['layers'] = {}
            
            filter_tags = []
            for tag_key, tag_values in values.get('overpass', {}).items():
                tag_values = list(set(tag_values))
                filter_tags = set([tag_key] if len(tag_values) == 0 else [f'{tag_key}={i}' if not is_landmarks else f'{tag_key}~{i},i' for i in tag_values])

                layers = queryset.filter(tags__in=filter_tags)
                matched_tags = set(layers.values_list('tags', flat=True))

                if filter_tags != matched_tags:
                    if not is_landmarks:
                        is_valid_tag_key = TaginfoKey.objects.filter(key=tag_key).exists()
                        if not is_valid_tag_key:
                            continue

                        if len(tag_values) > 0:
                            response = get_response(
                                url=f'https://taginfo.openstreetmap.org/api/4/key/prevalent_values?key={tag_key}',
                                header_only=False,
                                with_default_headers=False,
                                raise_for_status=True
                            )
                            
                            if not response:
                                continue
                        
                            prevalent_values = [i.get('value') for i in response.json().get('data', [])]
                            tag_values = [i for i in tag_values if i in prevalent_values]
                            filter_tags = set([tag_key] if len(tag_values) == 0 else [f'{tag_key}={i}' if not is_landmarks else f'{tag_key}~{i},i' for i in tag_values])

                    if filter_tags != matched_tags:
                        layers = list(layers)

                        for tag in filter_tags:
                            if tag in matched_tags:
                                continue

                            layer, _ = Layer.objects.get_or_create(
                                collection=overpass_collection,
                                name=f'osm-{tag}',
                                defaults={
                                    'type':'overpass',
                                    'srid':srs,
                                    'bbox':WORLD_GEOM,
                                    'tags':tag,
                                    'title':tag,
                                    'attribution':'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.',
                                    'keywords':get_keywords_from_url(overpass_url) + [tag_key, 'openstreetmap'] + tag_values
                                }
                            )

                            if layer:
                                layers.append(layer)

                for layer in set(list(layers)):
                    categories[id]['layers'][layer.pk] = layer.data

            del categories[id]['overpass']

            query = [i for i in values.get('query','').split() if i not in QUERY_BLACKLIST]

            filtered_queryset = (
                queryset
                .exclude(tags__in=filter_tags)
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
                category_layers[id] = {
                    'title': values.get('title'),
                    'layers': {
                        layer.pk: {
                            'name': layer.name,
                            'title': layer.title,
                            'abstract': layer.abstract,
                            'keywords': ', '.join(layer.keywords if layer.keywords else []),
                        } for layer in filtered_queryset[:5]
                    }
                }

            del categories[id]['query']

        if category_layers:
            params = layers_eval_info(user_prompt, category_layers, client)
            layers_eval = json.loads(params.layers)
            
            for id, layers in layers_eval.items():
                layers = queryset.filter(pk__in=set(map(int, layers)))
                categories[id]['layers'] = {layer.pk: layer.data for layer in layers} | categories[id]['layers']

        categories = {id: params for id, params in categories.items() if len(list(params['layers'].keys())) > 0}

        return {
            'subject': user_prompt,
            'bbox': bbox,
            'title': init_eval.title,
            'categories': categories
        }
    except Exception as e:
        print(e)
