const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'drawing', 'query', 'indicators').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
 
        layerGroup._hiddenLayers = []
        layerGroup.getHiddenLayers = () => layerGroup._hiddenLayers
        layerGroup.hasHiddenLayer = (layer) => layerGroup.getHiddenLayers().contains(layer)

        map.addLayer(layerGroup)
    })

    map.getLayerGroups = () => map._layerGroups 
    map.getLayerGroup = (layer) => {
        const groups = Object.values(layerGroups).filter(group => group.hasLayer(layer) || group.hasHiddenLayer(layer)) 
        return groups.length ? groups[0] : null
    }

    map.on('click', (e) => {
        if (!isLeafletControlElement(e.originalEvent.target)) map.getLayerGroups().indicators.clearLayers()
    })
}