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
                
                const geojsonLayers = []
                let count = 0
                layerGroups.forEach(group => {
                    group.eachLayer(layer => {
                        const type = getLeafletLayerType(layer)
                        if (!['geojson', 'feature'].includes(type)) return
                        
                        const geojsonLayer = type === 'geojson' ? layer : findFeatureLayerGeoJSONLayer(layer)
                        if (geojsonLayers.includes(geojsonLayer)) return

                        geojsonLayers.push(geojsonLayer)
                        const layers = group.hasLayer(geojsonLayer) ? geojsonLayer.getLayers() : geojsonLayer.getLayers().filter(l => group.hasLayer(l))
                        layers.forEach(l => {
                            if (!group.hasLayer(l) && !group.hasLayer(geojsonLayer)) return
                            if (l.feature.geometry.type.toLowerCase().endsWith('point')) return
                            count +=1
                        })
                    })
                })
                
                console.log(count)
                const renderer = count > 100 ? L.Canvas : L.SVG
                geojsonLayers.forEach(layer => {
                    if (layer.options.renderer instanceof renderer) return

                    const group = layer._group
                    const isLegendGroup = map._legendLayerGroups.includes(group)
                    const newRenderer = Object.values(layer._renderers).find(r => {
                        const isRenderer = r instanceof renderer
                        r._container?.classList.toggle('d-none', !isRenderer)
                        return isRenderer
                    })
                    layer.options.renderer = newRenderer
                    console.log(layer, renderer)
                })
            }, 100);
        }
    })
}