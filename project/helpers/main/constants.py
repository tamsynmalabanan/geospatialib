from django.contrib.gis.geos import GEOSGeometry, Polygon

XYZ_TILES_CHARS = ['{', '}', '%7B', '%7D']


WORLD_GEOM = GEOSGeometry(Polygon([
    (-180, -90), (180, -90), (180, 90), (-180, 90), (-180, -90)
]), srid=4326)

LONGITUDE_ALIASES = [
    'x', 'lon', 'long', 'lng', 'longitude', 'easting', 'westing',
    'lambda', 'meridian', 'geo_x', 'geom_x', 'x_coord', 
    'east_west', 'west_east', 'horizontal_position', 'east', 'west'
]

LATITUDE_ALIASES = [
    'y', 'lat', 'latitude', 'northing', 'southing',
    'phi', 'parallel', 'geo_y', 'geom_y', 'y_coord',
    'north_south', 'south_north', 'vertical_position', 'north', 'south'
]
