const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
        layerGroup._name = group

        layerGroup._hiddenLayers = []
        layerGroup.getHiddenLayers = () => layerGroup._hiddenLayers
        layerGroup.hasHiddenLayer = (layer) => {
            return layerGroup.getHiddenLayers().includes(layer)
        }
        layerGroup.getHiddenLayer = (layerId) => {
            const matches = layerGroup.getHiddenLayers().filter(l => {
                console.log(l._leaflet_id)
                return l._leaflet_id === layerId
            })
            if (matches.length) return matches[0]
        }
        layerGroup.hideLayer = (layer) => {
            layerGroup._hiddenLayers = [...layerGroup._hiddenLayers, layer]
            console.log(layerGroup.removeLayer(layer))
        }
        layerGroup.showLayer = (layer) => {
            layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(l => l !== layer)
            layerGroup.addLayer(layer)
        }
        layerGroup.getBounds = () => {
            const bounds = [
                ...layerGroup.getLayers(), 
                ...layerGroup.getHiddenLayers()
            ].map(layer => {
                if (layer.getBounds) {
                    return L.rectangle(layer.getBounds()).toGeoJSON()
                }
            }).filter(bound => bound)

            if (bounds.length) {
                return L.geoJSON(turf.featureCollection(bounds)).getBounds()
            }
        }

        map.addLayer(layerGroup)
    })

    map.getLayerGroups = () => map._layerGroups 

    map.getLayerGroup = (layer) => {
        for (const group of Object.values(map.getLayerGroups())) {
            if (group.hasLayer(layer) || group.hasHiddenLayer(layer)) {
                return group
            }
        }
    }

    const queryPane = map.getPane('queryPane') || map.createPane('queryPane')
    queryPane.style.zIndex = 599

    map.hasLegendLayer = (layer) => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            if (group.hasLayer(layer) || group.hasHiddenLayer(layer)) {
                return group
            }
        }
    }
    
    map.hasHiddenLegendLayer = (layer) => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            if (group.hasHiddenLayer(layer)) return group
        }
    }
    
    map.hasHiddenLegendLayers = () => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            if (group._hiddenLayers.length) return true
        }
    }

    map.getLegendLayer = (layerId) => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            const layer = group.getLayer(layerId) || group.getHiddenLayer(layerId)
            if (layer) return layer
        }
    }
    
    map.getLegendLayers = () => {
        let layers = []
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            layers = [
                ...layers,
                ...group.getLayers(),
                ...group.getHiddenLayers()
            ]
        }
        return layers
    }
    
    map.clearLegendLayers = () => {
        ['library', 'client'].forEach(groupName => {
            map.getLayerGroups()[groupName].clearLayers()
        })
    }
    
    map.hideLegendLayers = () => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            group._hiddenLayers = [...group._hiddenLayers, ...group.getLayers()]
            group.clearLayers()
        }
    }
    
    map.showLegendLayers = () => {
        for (const groupName of ['library', 'client']) {
            const group = map.getLayerGroups()[groupName]
            group._hiddenLayers.forEach(l => group.addLayer(l))
            group._hiddenLayers = []
        }
    }

    map.zoomToLegendLayers = () => {
        const bounds = ['library', 'client'].map(groupName => {
            const group = map.getLayerGroups()[groupName]
            const bounds = group.getBounds()
            if (bounds) {
                return L.rectangle(bounds).toGeoJSON()
            }
        }).filter(bound => bound)

        if (bounds.length) {
            map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
        }
    }
}