from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.core.cache import cache
from django.db.models import Count, Q, Max
from django.utils.functional import cached_property
from django.views.generic import ListView

from functools import reduce
from operator import or_, add

from main.models import Layer

class LayerList(ListView):
    template_name = 'main/search/results.html'
    model = Layer
    context_object_name = 'layers'
    paginate_by = 24

    @cached_property
    def filter_fields(self):
        return [
            'type',
        ]

    @property
    def query_params(self):
        query = self.request.GET.get('query', '').strip()
        exclusions = []

        if ' -' in f' {query}':
            keywords = query.split(' ')
            exclusions = [i[1:] for i in keywords if i.startswith('-') and len(i) > 2]
            query = ' '.join([i for i in keywords if not i.startswith('-') and i != ''])

        query = query.replace(' ', ' OR ')

        return (query, exclusions)

    @cached_property
    def query_values(self):
        return [str(i).strip() for i in list(self.request.GET.values()) if i and i != '']

    @cached_property
    def cache_key(self):
        return ';'.join([str(i) for i in ['LayerList',]+self.query_values])

    @property
    def filtered_queryset(self):
        query, exclusions = self.query_params

        queryset = (
            super().get_queryset()
            .select_related(
                'collection__url',
            )
        )

        if exclusions:
            queryset = queryset.exclude(reduce(
                or_, 
                (Q(name__icontains=word) | Q(title__icontains=word) for word in exclusions), 
                Q()
            ))

        if len(self.query_values) > 1:
            queryset = queryset.filter(**{
                param : value 
                for param, value in self.request.GET.items()
                if value and param in self.filter_fields + [
                    'bbox__bboverlaps'
                ]
            })

        search_query = SearchQuery(query, search_type='websearch')

        search_vector = reduce(add, (SearchVector(field) for field in self.filter_fields + [
            'name',
            'title',
            'abstract',
            'keywords',
            'attribution',
            'styles',
        ]))

        queryset = (
            queryset.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            ).filter(
                search=search_query,
                rank__gte=0.001
            )
        )
        
        return queryset

    @property
    def query_filters(self):
        filters = {
            field: list(
                self.queryset
                .values(field)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count')
            ) for field in self.filter_fields
        }

        for field in self.filter_fields:
            value = self.request.GET.get(field)
            if value and len(filters.get(field, [])) == 0:
                filters[field] = [{field: value, 'count': 0}]

        return filters

    def get_queryset(self):
        if not hasattr(self, 'queryset') or getattr(self, 'queryset') is None:
            queryset = cache.get(self.cache_key)

            if not queryset or not queryset.exists():
                queryset = self.filtered_queryset

            if queryset.exists():
                cache.set(self.cache_key, queryset, timeout=60*15)
                
            self.queryset = queryset

        queryset = self.queryset

        if queryset and queryset.exists():
            queryset = (
                self.queryset
                .annotate(rank=Max('rank'))
                .order_by(*['-rank', 'title','type'])
            )

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if context['page_obj'].number == 1:
            context['filters'] = self.query_filters
            context['values'] = self.query_values
        return context