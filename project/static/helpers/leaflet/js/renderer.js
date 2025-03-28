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
            console.log(pathLayers, pathLayers.size)
            // const renderer = pathLayers.length > 100 ? L.Canvas : L.SVG
            // if (map._rendererFn === renderer) return

            // map._rendererFn = renderer
            // pathLayers.forEach(l => {
            //     if (l.options.renderer instanceof renderer) return
                
            //     const geojsonLayer = findLeafletFeatureLayerParent(l)
            //     geojsonLayer.options.renderer = Object.values(geojsonLayer._renderers).find(r => r instanceof renderer)
            //     console.log(geojsonLayer.options.renderer)
            // })
        }, 100);
    })

}