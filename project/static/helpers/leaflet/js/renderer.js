const getPathLayers = (map) => {
    const pathLayers = []
    Object.values(map._ch.getLayerGroups()).forEach(group => {
        group.eachLayer(layer => {
            const type = getLeafletLayerType(layer)
            const layers = type === 'geojson' ? layer.getLayers() : type === 'feature' ? [layer] : []
            layers.forEach(l => {
                if (!pathLayers.includes(l)) pathLayers.push(l)
            }) 
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
            console.log(pathLayers)
            const renderer = pathLayers.length > 100 ? L.Canvas : L.SVG
            if (map._rendererFn === renderer) return console.log('correct map renderer') 
            map._rendererFn = renderer
            pathLayers.forEach(l => {
                const currentRenderer = l.options.renderer
                if (currentRenderer instanceof renderer) return console.log('correct layer renderer', currentRenderer)
                
                const geojsonLayer = findLeafletFeatureLayerParent(l)
                console.log('update renderer', geojsonLayer)
            })
        }, 100);
    })

}