const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
 
        layerGroup._hiddenLayers = []
        layerGroup.getHiddenLayers = () => layerGroup._hiddenLayers
        layerGroup.hasHiddenLayer = (layer) => {
            return layerGroup.getHiddenLayers().includes(layer)
        }
        layerGroup.getHiddenLayer = (layerId) => {
            const matches = layerGroup.getHiddenLayers().filter(l => {
                return l._leaflet_id === layerId
            })
            if (matches.length) return matches[0]
        }
        layerGroup.hideLayer = (layer) => {
            layerGroup._hiddenLayers.push(layer)
            layerGroup.removeLayer(layer)
        }
        layerGroup.showLayer = (layer) => {
            layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(l => l !== layer)
            layerGroup.addLayer(layer)
        }

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
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            if (group.hasLayer(layer) || group.hasHiddenLayer(layer)) {
                return groupName
            }
        }
    }

    map.getLegendLayer = (layerId) => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            const visibleLayer = group.getLayer(layerId) 
            const hiddenLayer = group.getHiddenLayer(layerId)
            if (visibleLayer || hiddenLayer) return [
                visibleLayer || hiddenLayer,
                group,
                hiddenLayer && !visibleLayer ? true : false
            ]
        }
    }
    
    map.clearLegendLayers = () => {
        ['library', 'client'].forEach(groupName => {
            map.getLayerGroups()[groupName].clearLayers()
        })
    }
    
    map.getHiddenLegendLayers = () => {
        const hiddenLayers = []
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            hiddenLayers.concat(group.getHiddenLayers())
        }
        return hiddenLayers
    }
}