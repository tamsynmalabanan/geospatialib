from helpers.base.utils import (
    remove_query_params,
    get_domain_url,
)

def get_clean_url(url, format, exclusions=[]):
    if format in exclusions:
        return url

    if format == 'xyz':
        return get_domain_url(url)
    
    if format.startswith('ogc-') or format == 'overpass':
        return remove_query_params(url) or url
    
    return url