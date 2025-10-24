from django.core.cache import cache

from helpers.base.utils import (
    remove_query_params,
    get_domain_url,
)

import matplotlib
import matplotlib.pyplot as plt
import geopandas as gpd
from shapely.geometry import box
from io import BytesIO
import base64
import os
from staticmap import StaticMap, CircleMarker
from PIL import Image

import logging
logger = logging.getLogger('django')

matplotlib.use('Agg')

def get_clean_url(url, format, exclusions=[]):
    if format in exclusions:
        return url

    if format == 'xyz':
        return get_domain_url(url)
    
    if format.startswith('ogc-') or format == 'overpass':
        return remove_query_params(url) or url
    
    return url

def get_world_gdf():
    world = cache.get('world_gdf')

    if world is None:
        shapefile_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            "data/ne_110m_admin_0_countries", 
            "ne_110m_admin_0_countries_simplified.shp"
        )
        world = gpd.read_file(shapefile_path)
        cache.set('world_gdf', world, timeout=None)
    
    return world

def create_extent_map(extent):
    try:
        world = get_world_gdf()

        extent_geom = box(*extent)
        extent_gdf = gpd.GeoDataFrame(geometry=[extent_geom], crs=world.crs)

        fig, ax = plt.subplots(figsize=(6, 3))
        world.plot(ax=ax, edgecolor='black', linewidth=0.5, facecolor='lightgray')
        extent_gdf.boundary.plot(ax=ax, edgecolor='red', linewidth=3)
        ax.axis('off')

        fig.tight_layout()

        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
        plt.close()

        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        return f'data:image/png;base64,{img_base64}'
    except Exception as e:
        logger.error(f'create_extent_map: {e}')

def create_xyz_map(xyz):
    try:
        map = StaticMap(360, 180, url_template=xyz)

        marker = CircleMarker((0.0, 0.0), (255, 0, 0, 0), 1)
        map.add_marker(marker)

        image = map.render(zoom=0)

        # image.save('static_map.png')

        buffer = BytesIO()
        image.save(buffer, format='PNG')
        base64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{base64_str}"
    except Exception as e:
        logger.error(f'{create_xyz_map}: e')