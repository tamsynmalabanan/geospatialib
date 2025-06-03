from owslib.wms import WebMapService

def get_wms_layers(url):
    layers = {}
    
    try:
        wms = WebMapService(url, timeout=60*3)
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
    
    return layers