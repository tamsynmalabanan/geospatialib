const getPathLayers = (map) => {
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

const handlerLeafletRenderer = (map) => {
    map._rendererFn = L.SVG
    
    let timeout
    const renderingLayers = new Map()
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const pathLayers = getPathLayers(map)
            const renderer = pathLayers.size > 5 ? L.Canvas : L.SVG
            if (map._rendererFn === renderer) return

            map._rendererFn = renderer
            for (const [layer, parent] of pathLayers) {
                if (layer.options.renderer instanceof renderer) return
                
                const geojsonLayer = findLeafletFeatureLayerParent(layer)
                geojsonLayer.options.renderer = Object.values(geojsonLayer._renderers).find(r => r instanceof renderer)
            
                renderingLayers.set(layer.feature.properties.gsl_id, layer._leaflet_id)
                console.log(geojsonLayer.getLayers())
                layer.removeFrom(geojsonLayer)
                console.log(geojsonLayer.getLayers())
            }
        }, 100);
    })

}