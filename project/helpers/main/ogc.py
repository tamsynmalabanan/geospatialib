import logging
from owslib.wms import WebMapService
import requests
import xml.etree.ElementTree as ET

logging.basicConfig(filename="wms_debug.log", level=logging.DEBUG)

def get_wms_layers(url):
    layers = {}

    try:
        logging.info("Attempting WebMapService...")
        wms = WebMapService(url)
        layer_names = list(wms.contents)

        for i in layer_names:
            layer = wms[i]
            params = {'type': 'wms', 'title': layer.title}

            bbox = layer.boundingBoxWGS84 or layer.boundingBox
            params.update({'bbox': bbox or (-180, -90, 180, 90), 'srid': 4326})

            layers[i] = params

    except MemoryError:
        logging.error("MemoryError encountered. Process likely killed.")
    except SystemExit:
        logging.error("SystemExit encountered.")
    except Exception as e:
        logging.error(f"WebMapService failed: {e}")
        print("Falling back to manual XML parsing...")

        try:
            response = requests.get(f"{url}?request=GetCapabilities")
            response.raise_for_status()
            root = ET.fromstring(response.content)

            for layer in root.findall(".//{http://www.opengis.net/wms}Layer"):
                name_elem = layer.find("{http://www.opengis.net/wms}Name")
                title_elem = layer.find("{http://www.opengis.net/wms}Title")

                if name_elem is not None:
                    layers[name_elem.text] = {'type': 'wms', 'title': title_elem.text if title_elem is not None else ""}

        except Exception as e:
            logging.error(f"XML parsing failed: {e}")

    return layers