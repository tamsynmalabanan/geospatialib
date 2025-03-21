const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
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

    const queryPane = map.getPane('queryPane') || map.createPane('queryPane')
    queryPane.style.zIndex = 599

    map.isLegendLayer = (layer) => {
        return ['library', 'client'].some(groupName => {
            const group = map.getLayerGroups()[groupName]
            return group.hasLayer(layer) || group.hasHiddenLayer(layer)
        })
    }
}