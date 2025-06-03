from django.core.management.base import BaseCommand
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q

from helpers.base.utils import get_response, get_response
from helpers.base.files import get_file_names
from helpers.main.collection import get_collection_data, get_layers, get_file_names, update_collection_data
from main.tasks import onboard_collection
from main.models import URL
from main.forms import ValidateCollectionForm



from owslib.wms import WebMapService
import validators
import requests
import re
from urllib.parse import urlparse, urlunparse


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
    url = 'https://www.cmar.csiro.au/geoserver/wms?'
    value = get_collection_data(url, delay=False)
    print(value)

def test_update_collection_data():
    cacheKey = 'onboard_collection;https://github.com/tamsynmalabanan/gis-data/raw/refs/heads/main/Special Protection and Conservation Areas GeoJson.zip;file'
    updated_layers = {
        "Special Protection and Conservation Areas GeoJson.zip/Special Protection and Conservation Areas GeoJson.geojson": {
            "title": "Special Protection and Conservation Areas GeoJson", 
            "type": "geojson"
        }, 
        "Special Protection and Conservation Areas GeoJson.zip/cinemas.zip/cinemas.csv": {
            "title": "cinemas", 
            "type": "csv", 
            "xField": "Eastings", 
            "yField": "Northings", 
            "srid": "27700"
        }
    }
    collection_data = update_collection_data(cacheKey, updated_layers, delay=False)
    print(collection_data)

class Command(BaseCommand):
    help = 'Test'
    def handle(self, *args, **kwargs):
        URL.objects.all().delete()

        # test_get_collection_data()

        url = 'https://www.cmar.csiro.au/geoserver/wms?'

        wms = WebMapService(url)
        print(wms)

        response = get_response(url, raise_for_status=False)
        print(response.content)

        self.stdout.write(self.style.SUCCESS('Done.'))