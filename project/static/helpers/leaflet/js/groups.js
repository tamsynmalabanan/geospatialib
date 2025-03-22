const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
 
        layerGroup._hiddenLayers = []
        layerGroup.getHiddenLayers = () => layerGroup._hiddenLayers
        layerGroup.hasHiddenLayer = (layer) => layerGroup.getHiddenLayers().includes(layer)

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

    map.getLegendLayer = (layerId) => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            const layer = group.getLayer(layerId)
            if (layer) return layer
        }
    }

    map.clearLegendLayers = () => {
        ['library', 'client'].forEach(groupName => {
            map.getLayerGroups()[groupName].clearLayers()
        })
    }
}