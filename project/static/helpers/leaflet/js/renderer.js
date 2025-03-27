const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    
    let timeout
    map.on('layeradd layerremove', (e) => {
        const feature = e.layer.feature
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (feature && !isPoint) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                console.log(e)
    
                const featureLayers = []
                const layerGroups = Object.values(map._ch.getLayerGroups())
                layerGroups.forEach(group => {
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        if (!['geojson', 'feature'].includes(type)) return
                        
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        const layers = group.hasLayer(geojsonLayer) ? geojsonLayer.getLayers() : [layer]
                        layers.forEach(l => {
                            if (featureLayers.includes(l) || !group.hasLayer(l) || l.feature.geometry.type.toLowerCase().endsWith('point')) return 
                            featureLayers.push(l)
                        })
                    })
                })

                console.log(featureLayers.length)
            }, 100);
        }
    })
}