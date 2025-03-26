const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
        
        layerGroup._name = group
        layerGroup._hiddenLayers = []
        layerGroup._ch = {
            getHiddenLayers: () => {
                return layerGroup._hiddenLayers
            },
            hasHiddenLayer: (layer) => {
                return layerGroup._ch.getHiddenLayers().includes(layer)
            },
            getAllLayers: () => {
                return [
                    ...layerGroup.getLayers(),
                    ...layerGroup._ch.getHiddenLayers()
                ]
            },
            getHiddenLayer: (id) => {
                for (const l of layerGroup._ch.getHiddenLayers()) {
                    if (l._leaflet_id === id) return l
                }
            },
            removeHiddenLayer: (layer, {silent=false}={}) => {
                const match = layerGroup._ch.getHiddenLayers().find(l => l === layer)
                layerGroup._hiddenLayers = layerGroup._ch.getHiddenLayers().filter(l => l !== layer)
                if (match && !silent) map.fire('layerremove', {layer})
            },
            clearHiddenLayers: ({silent=false}={}) => {
                layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(layer => {
                    if (!silent) map.fire('layerremove', {layer})
                })
            },
            clearLayer: (layer) => {
                layerGroup._ch.removeLayer(layer)
                layerGroup._ch.removeHiddenLayer(layer)
                
                const paneName = layer.options.pane
                if (paneName.startsWith('custom')) {
                    deletePane(map, paneName)
                }

                
            },
            clearAllLayers: () => {
                layerGroup._ch.getAllLayers().forEach(l => layerGroup._ch.clearLayer(l))
            },
            hideLayer: (layer) => {
                layerGroup._hiddenLayers.push(layer)
                layerGroup.removeLayer(layer)
            },
            hideAllLayers: () => {
                layerGroup.eachLayer(l => layerGroup._ch.hideLayer(l))
            },
            showLayer: (layer) => {
                layerGroup._ch.removeHiddenLayer(layer, {silent:true})
                layerGroup.addLayer(layer)
            },
            showAllLayers: () => {
                layerGroup._ch.getHiddenLayers().forEach(l => layerGroup._ch.showLayer(l))
            },
            getBounds: () => {
                const bounds = [
                    ...layerGroup.getLayers(), 
                    ...layerGroup._ch.getHiddenLayers()
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

    map._ch = {
        getLayerGroups: () => {
            return map._layerGroups
        },
        getLayerGroup: (layer) => {
            for (const group of Object.values(map._ch.getLayerGroups())) {
                if (group.hasLayer(layer) || group._ch.hasHiddenLayer(layer)) {
                    return group
                }
            }
        },
        hasLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group.hasLayer(layer) || group._ch.hasHiddenLayer(layer)) {
                    return group
                }
            }
        },
        hasHiddenLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._ch.hasHiddenLayer(layer)) return group
            }
        },
        hasHiddenLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                if (group._ch.getHiddenLayers().length) return true
            }
        },
        getLegendLayer: (id) => {
            for (const group of map._legendLayerGroups) {
                const layer = group.getLayer(id) || group._ch.getHiddenLayer(id)
                if (layer) return layer
            }
        },
        getLegendLayers: () => {
            let layers = []
            for (const group of map._legendLayerGroups) {
                layers = [
                    ...layers,
                    ...group.getLayers(),
                    ...group._ch.getHiddenLayers()
                ]
            }
            return layers
        },
        clearLegendLayers: () => {
            map._legendLayerGroups.forEach(group => group._ch.clearAllLayers())
        },
        hideLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._ch.hideAllLayers()
            }
        },
        showLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._ch.showAllLayers()
            }
        },
        zoomToLegendLayers: () => {
            const bounds = map._legendLayerGroups.map(group => {
                const bounds = group._ch.getBounds()
                if (bounds) return L.rectangle(bounds).toGeoJSON()
            }).filter(bound => bound)
    
            if (bounds.length) {
                map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
            }
        },
    }

    map._legendLayerGroups = Object.values(map._ch.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))
}