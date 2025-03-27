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
                Object.values(map._ch.getLayerGroups()).forEach(group => {
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        if (!['geojson', 'feature'].includes(type)) return
                        
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        console.log(geojsonLayer)
                        const layers = group.hasLayer(geojsonLayer) ? geojsonLayer.getLayers() : [layer]
                        console.log(layers)
                        layers.forEach(l => {
                            if (featureLayers.includes(l) || !group.hasLayer(l) || l.feature.geometry.type.toLowerCase().endsWith('point')) return console.log(l)
                            featureLayers.push(l)
                        })
                        console.log(featureLayers)
                    })
                    console.log(featureLayers)
                })

                console.log(featureLayers, featureLayers.length)
            }, 100);
        }
    })
}