const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        const feature = e.layer.feature
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (feature && !isPoint) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                console.log('EVENT', e)
    
                const featureLayers = []
                Object.values(map._ch.getLayerGroups()).forEach(group => {
                    // console.log('group name', group._name)
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        // if (!['geojson', 'feature'].includes(type)) return
                        
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        // console.log('geojsonLayer', geojsonLayer)
                        const layers = group.hasLayer(geojsonLayer) ? geojsonLayer.getLayers() : [layer]
                        // console.log('layers', layers)
                        layers.forEach(l => {
                            if (featureLayers.includes(l)) return console.log('already in featureLayers', l)
                            if (!group.hasLayer(l)) return console.log('not shown', l)
                            if (l.feature.geometry.type.toLowerCase().endsWith('point')) return console.log('is point', l)
                            featureLayers.push(l)
                        })
                        // console.log('featureLayers after geojson layers loop', featureLayers)
                    })
                    // console.log('featureLayers after group loop', featureLayers)
                })

                console.log('END', featureLayers, featureLayers.length)
            }, 100);
        }
    })
}