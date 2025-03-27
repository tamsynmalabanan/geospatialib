const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        const feature = e.layer.feature
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (feature && !isPoint) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                const layerGroups = Object.values(map._ch.getLayerGroups())
                
                const featureLayers = []
                layerGroups.forEach(group => {
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        const layers = group.hasLayer(geojsonLayer) ? geojsonLayer.getLayers() : [layer]
                        layers.forEach(l => {
                            if (featureLayers.includes(l)) return
                            if (!group.hasLayer(l) && !group.hasLayer(geojsonLayer)) return
                            if (l.feature.geometry.type.toLowerCase().endsWith('point')) return
                            featureLayers.push(l)
                        })
                    })
                })

                const renderer = featureLayers.length > 100 ? 'canvas' : 'svg'
                console.log(featureLayers, featureLayers.length, renderer)


            }, 100);
        }
    })
}