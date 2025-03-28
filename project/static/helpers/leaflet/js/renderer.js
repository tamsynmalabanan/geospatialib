const getLeafletPathLayers = (map) => {
    const pathLayers = new Map()
    Object.values(map._ch.getLayerGroups()).forEach(group => {
        group.eachLayer(layer => {
            const type = getLeafletLayerType(layer)

            if (type === 'feature' && !layer.feature.geometry.type.endsWith('Point')) {
                pathLayers.set(layer, group)        
            }

            if (type === 'geojson') {
                layer.eachLayer(l => {
                    if (!l.feature.geometry.type.endsWith('Point')) pathLayers.set(l, layer)
                })
            }
        })
    })
    return pathLayers
}

const resolveRerenderedLeafletPathLayer = (oldLayer, newLayer) => {
    if (oldLayer._checkbox) newLayer._checkbox = oldLayer._checkbox
    
}

const handlerLeafletRenderer = (map) => {
    map._rendererFn = L.SVG
    
    let timeout
    // const renderingLayers = new Map()
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const pathLayers = getLeafletPathLayers(map)
            const renderer = pathLayers.size > 5 ? L.Canvas : L.SVG
            if (map._rendererFn === renderer) return

            map._rendererFn = renderer
            for (const [layer, parent] of pathLayers) {
                if (layer.options.renderer instanceof renderer) return
                
                const geojsonLayer = findLeafletFeatureLayerParent(layer)
                geojsonLayer.options.renderer = Object.values(geojsonLayer._renderers).find(r => r instanceof renderer)
            
                const gslId = layer.feature.properties.gslId
                // renderingLayers.set(gslId, layer._leaflet_id)
                layer.removeFrom(geojsonLayer)
                geojsonLayer.addData(layer.toGeoJSON())
                const newLayer = geojsonLayer.getLayers().find(l => l.feature.properties.gslId === gslId)
                resolveRerenderedLeafletPathLayer(layer, newLayer)
                console.log(newLayer)
            }
        }, 100);
    })
}