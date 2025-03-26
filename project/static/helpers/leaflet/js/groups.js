const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
        
        layerGroup._name = group
        layerGroup._hiddenLayers = []
        layerGroup._customHandlers = {
            getHiddenLayers: () => {
                return layerGroup._hiddenLayers
            },
            hasHiddenLayer: (layer) => {
                return layerGroup._customHandlers.getHiddenLayers().includes(layer)
            },
            getAllLayers: () => {
                return [
                    ...layerGroup.getLayers(),
                    ...layerGroup._customHandlers.getHiddenLayers()
                ]
            },
            getHiddenLayer: (id) => {
                for (const l of layerGroup._customHandlers.getHiddenLayers()) {
                    if (l._leaflet_id === id) return l
                }
            },
            removeHiddenLayer: (layer, {silent=false}={}) => {
                const match = layerGroup._customHandlers.getHiddenLayers().find(l => l === layer)
                layerGroup._hiddenLayers = layerGroup._customHandlers.getHiddenLayers().filter(l => l !== layer)
                if (match && !silent) map.fire('layerremove', {layer})
            },
            clearHiddenLayers: ({silent=false}={}) => {
                layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(layer => {
                    if (!silent) map.fire('layerremove', {layer})
                })
            },
            clearAllLayers: () => {
                layerGroup.clearLayers()
                layerGroup._customHandlers.clearHiddenLayers()
            },
            hideLayer: (layer) => {
                layerGroup._hiddenLayers.push(layer)
                layerGroup.removeLayer(layer)
            },
            hideAllLayers: () => {
                layerGroup.eachLayer(l => layerGroup._customHandlers.hideLayer(l))
            },
            showLayer: (layer) => {
                layerGroup._customHandlers.removeHiddenLayer(layer, {silent:true})
                layerGroup.addLayer(layer)
            },
            showAllLayers: () => {
                layerGroup._customHandlers.getHiddenLayers().forEach(l => layerGroup._customHandlers.showLayer(l))
            },
            getBounds: () => {
                const bounds = [
                    ...layerGroup.getLayers(), 
                    ...layerGroup._customHandlers.getHiddenLayers()
                ].map(layer => {
                    if (layer.getBounds) {
                        return L.rectangle(layer.getBounds()).toGeoJSON()
                    }
                }).filter(bound => bound)
    
                if (bounds.length) {
                    return L.geoJSON(turf.featureCollection(bounds)).getBounds()
                }
            },
        }

        map.addLayer(layerGroup)
    })

    map._legendLayerGroups = Object.values(map.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))

    map.addHandler('getLayerGroups', () => map._layerGroups)

    // map.getLayerGroups = () => map._layerGroups 

    map.getLayerGroup = (layer) => {
        for (const group of Object.values(map.getLayerGroups())) {
            if (group.hasLayer(layer) || group._customHandlers.hasHiddenLayer(layer)) {
                return group
            }
        }
    }

    map.hasLegendLayer = (layer) => {
        for (const group of map._legendLayerGroups) {
            if (group.hasLayer(layer) || group._customHandlers.hasHiddenLayer(layer)) {
                return group
            }
        }
    }
    
    map.hasHiddenLegendLayer = (layer) => {
        for (const group of map._legendLayerGroups) {
            if (group._customHandlers.hasHiddenLayer(layer)) return group
        }
    }
    
    map.hasHiddenLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            if (group._customHandlers.getHiddenLayers().length) return true
        }
    }

    map.getLegendLayer = (id) => {
        for (const group of map._legendLayerGroups) {
            const layer = group.getLayer(id) || group._customHandlers.getHiddenLayer(id)
            if (layer) return layer
        }
    }
    
    map.getLegendLayers = () => {
        let layers = []
        for (const group of map._legendLayerGroups) {
            layers = [
                ...layers,
                ...group.getLayers(),
                ...group._customHandlers.getHiddenLayers()
            ]
        }
        return layers
    }
    
    map.clearLegendLayers = () => {
        map._legendLayerGroups.forEach(group => group._customHandlers.clearAllLayers())
    }
    
    map.hideLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            group._customHandlers.hideAllLayers()
        }
    }
    
    map.showLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            group._customHandlers.showAllLayers()
        }
    }

    map.zoomToLegendLayers = () => {
        const bounds = map._legendLayerGroups.map(group => {
            const bounds = group._customHandlers.getBounds()
            if (bounds) return L.rectangle(bounds).toGeoJSON()
        }).filter(bound => bound)

        if (bounds.length) {
            map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
        }
    }
}