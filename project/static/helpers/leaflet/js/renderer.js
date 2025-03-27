const handlerLeafletRenderer =(map) => {
    let activeLayers = []
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        if (activeLayers.includes(e.layer)) {
            if (e.type === 'layeradd') activeLayers = activeLayers.filter(l => l !== e.layer)
            return console.log('active layer', e.layer)
        }

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
                        if (!['geojson', 'feature'].includes(type)) return
                        
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
                
                const renderer = featureLayers.length > 100 ? L.Canvas : L.SVG
                layerGroups.forEach(group => {
                    const isLegendGroup = map._legendLayerGroups.includes(group)
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        if (!['geojson', 'feature'].includes(type)) return
                        
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        const currentRenderer = layer.options.renderer || geojsonLayer?.options.renderer
                        if (currentRenderer instanceof renderer) return
                        
                        const newRenderer = Object.values(geojsonLayer._renderers).find(r => {
                            const isRenderer = r instanceof renderer
                            r._container?.classList.toggle('d-none', !isRenderer)
                            return isRenderer
                        })
                        geojsonLayer.options.renderer = newRenderer
                        Array(geojsonLayer, ...geojsonLayer.getLayers()).forEach(l => {
                            if (!group.hasLayer(l)) return
                            activeLayers.push(l)
                            isLegendGroup ? group._ch.hideLayer(l) : group.removeLayer(l)
                            group._ch.showLayer(l)
                        })
                    })
                })
            }, 100);
        }
    })
}