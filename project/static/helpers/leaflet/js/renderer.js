const handlerLeafletRenderer =(map) => {
    const mappedLayers = new Map()
    let timeout
    
    map.on('layeradd layerremove', (e) => {
        const feature = e.layer.feature
        if (!feature) return

        const geojsonLayer = findFeatureLayerGeoJSONLayer(e.layer)
        console.log(e.layer, geojsonLayer)
        const id = geojsonLayer._leaflet_id
        let layerCount = mappedLayers.get(id)
        console.log(layerCount)
        if (layerCount !== undefined) {
            if (e.type === 'layeradd') {
                layerCount -= 1
                if (layerCount === 0) {
                    mappedLayers.delete(id)
                } else {
                    mappedLayers.set(id, layerCount)
                }
            }
            return
        }
        
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (isPoint) return

        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const geojsonLayers = []

            let count = 0
            Object.values(map._ch.getLayerGroups()).forEach(group => {
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
            
            const renderer = count > 100 ? L.Canvas : L.SVG
            
            geojsonLayers.forEach(layer => {
                if (layer.options.renderer instanceof renderer) return
                mappedLayers.set(layer._leaflet_id, layer.getLayers().length)
                
                const group = layer._group
                const isLegendGroup = map._legendLayerGroups.includes(group)
                const newRenderer = Object.values(layer._renderers).find(r => {
                    const isRenderer = r instanceof renderer
                    r._container?.classList.toggle('d-none', !isRenderer)
                    return isRenderer
                })
                layer.options.renderer = newRenderer
                const geojson = layer.toGeoJSON()
                layer.clearLayers()
                layer.addData(geojson)
            })
        }, 100)
    })
}