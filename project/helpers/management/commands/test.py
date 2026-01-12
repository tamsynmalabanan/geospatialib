from django.core.management.base import BaseCommand

import logging
logger = logging.getLogger('django')

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

    data = get_collection_data(url)
    print('layers count', len((data or {}).get('layers', {}).keys()))

def make_all_url_https():
    from main.models import URL
    from django.db.models import Q
    from django.db import IntegrityError

    urls = URL.objects.filter(~Q(path__startswith="https"))
    if urls.exists():
        for url in urls:
            logger.info(url)
            try:
                url.path = url.path.replace('http', 'https', 1)
                url.save()
                logger.info('updated')
            except IntegrityError as e:
                url.delete()
                logger.info('deleted duplicate')
            except Exception as e:
                logger.error(e)

class Command(BaseCommand):
    help = 'Test'
    def handle(self, *args, **kwargs):
        make_all_url_https()
        self.stdout.write(self.style.SUCCESS('Done.'))