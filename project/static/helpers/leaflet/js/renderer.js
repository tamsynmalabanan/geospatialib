const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        const feature = e.layer.feature
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (feature && !isPoint) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                const featureLayers = []
                Object.values(map._ch.getLayerGroups()).forEach(group => {
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
                console.log(featureLayers, featureLayers.length)
            }, 100);
        }
    })
}