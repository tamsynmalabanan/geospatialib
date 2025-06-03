import requests
import xml.etree.ElementTree as ET
from owslib.wms import WebMapService

def get_wms_layers(url):
    layers = {}
    
    try:
        wms = WebMapService(url)
        layer_names = list(wms.contents)
        for i in layer_names:
            layer = wms[i]
            params = {'type': 'wms', 'title': layer.title} 

            bbox = layer.boundingBoxWGS84 or layer.boundingBox
            w,s,e,n,*srid = bbox or (-180, -90, 180, 90, 4326)
            srid = int(srid[0].split(':')[-1]) if len(srid) > 0 else 4326
            # transform bbox if not 4326
            params.update({
                'bbox': bbox, 
                'srid': srid, 
            })
            layers[i] = params
    except Exception as e:
        print('get_wms_layers', e)
        try:
            response = requests.get(f"{url}?request=GetCapabilities")
            response.raise_for_status()
            root = ET.fromstring(response.content)

            # Parse layers manually
            for layer in root.findall(".//{http://www.opengis.net/wms}Layer"):
                name_elem = layer.find("{http://www.opengis.net/wms}Name")
                title_elem = layer.find("{http://www.opengis.net/wms}Title")
                
                if name_elem is not None:
                    name = name_elem.text
                    title = title_elem.text if title_elem is not None else ""
                    layers[name] = {'type': 'wms', 'title': title}
        
        except Exception as e:
            print(f"XML parsing failed: {e}")

    
    return layers