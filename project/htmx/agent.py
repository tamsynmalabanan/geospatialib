from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, Max

from main.models import Layer
from helpers.main.constants import QUERY_BLACKLIST, WORLD_GEOM

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
    categories: str = Field(description='''
        A JSON of 10 categories relevant to the subject with 10 query words and 10 Overpass QL tags, following this format: {
            "category_id": {
                "title": "Category Title",
                "description": "A detailed description of the relevance of the category to the subject.",
                "query": "word1 word2 word3...",
                "overpass": {
                    "tag_key": "",
                    "tag_key": "tag_value",
                    "tag_key:spec": "",
                    "tag_key:spec": "tag_value",
                    "tag_key": "(tag_value|tag_value)",
                    "tag_key:spec": "(tag_value|tag_value)",...
                },
            },...
        }
    ''' + '\n' + JSON_PROMPT_GUIDE)

def extract_theme_categories(user_prompt:str, client:OpenAI, model:str='gpt-4o') -> CategoriesExtraction:
    messages = [
        {
            'role': 'system',
            'content': '''
                1. Identify 10 diverse and spatially-applicable categories that are most relevant to the subject.
                    - Prioritize categories that correspond to topography, environmental, infrastructure, regulatory, or domain-specific datasets.
                    - Focus on thematic scope and spatial context; do not list layers.
                    - You must include **exactly 10 categories**.
                2. For each category, identify 10 query words most relevant to the category and subject.
                    - Each query word should be an individual real english word, without caps, conjunctions or special characters.
                    - Make sure query words are suitable for filtering geospatial layers.
                    - You must include **exactly 10 words** for each category—**no fewer, no more**.
                3. For each category, identify 10 valid Overpass QL tags most relevant to the category and subject.
                    - Tags must be valid OpenStreetMap tags supported by Overpass QL, using format.
                    - Use only tags listed on the OpenStreetMap wiki or Taginfo; exclude invented or rare tags.
                    - You must include **exactly 10 tags** for each category—**no fewer, no more**.
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
        
        title = init_eval.title
        
        w,s,e,n = json.loads(bbox)
        geom = GEOSGeometry(Polygon([(w,s),(e,s),(e,n),(w,n),(w,s)]), srid=4326)

        params = extract_theme_categories(user_prompt, client)
        categories = json.loads(params.categories)
        
        queryset = Layer.objects.filter(bbox__bboverlaps=geom)

        category_layers = {}
        for id, values in categories.items():
            query = [i for i in values.get('query','').split() if i not in QUERY_BLACKLIST]

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
                categories[id]['layers'] = [i.data for i in queryset.filter(pk__in=map(int, layers))]

        return {
            'subject': user_prompt,
            'bbox': bbox,
            'title': title,
            'categories': categories
        }
    except Exception as e:
        print(e)
