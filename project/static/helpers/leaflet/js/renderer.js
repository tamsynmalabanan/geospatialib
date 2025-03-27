const handlerLeafletRenderer =(map) => {
    let activeLayers = []
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        if (activeLayers.includes(e.layer)) {
            if (e.type === 'layeradd') activeLayers = activeLayers.filter(l => l !== e.layer)
            return
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
                featureLayers.forEach(layer => {
                    if (layer._renderer instanceof renderer) return
                    
                    const geojsonLayer = findFeatureLayerGeoJSONLayer(layer)
                    const newRenderer = Object.values(geojsonLayer._renderers).find(r => {
                        const isRenderer = r instanceof renderer
                        r._container?.classList.toggle('d-none', !isRenderer)
                        return isRenderer
                    })
                    Array(layer, geojsonLayer).forEach(l => l.options.renderer = newRenderer)
                    activeLayers.push(layer)
                    isLegendGroup ? group._ch.hideLayer(l) : group.removeLayer(l)
                    group._ch.showLayer(l)
                })
            }, 100);
        }
    })
}