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
            getHiddenLayer: (id) => {
                return layerGroup._ch.getHiddenLayers().find(l => l._leaflet_id === id)
            },
            hasHiddenLayer: (layer) => {
                return layerGroup._ch.getHiddenLayers().includes(layer)
            },
            removeHiddenLayer: (layer, {silent=false}={}) => {
                let match
                layerGroup._hiddenLayers = layerGroup._ch.getHiddenLayers().filter(l => {
                    if (l === layer) match = l
                    return l !== layer
                })
                if (match && !silent) map.fire('layerremove', {layer})
            },
            clearHiddenLayers: ({silent=false}={}) => {
                const hiddenLayers = [...new layerGroup._ch.getHiddenLayers()]
                layerGroup._hiddenLayers = []
                if (!silent) hiddenLayers.forEach(layer => map.fire('layerremove', {layer}))
            },
                
            getAllLayers: () => {
                return [
                    ...layerGroup.getLayers(),
                    ...layerGroup._ch.getHiddenLayers()
                ]
            },
                    
            clearLayer: (layer) => {
                layerGroup.removeLayer(layer)
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
        zoomToLegendLayers:  () => {
            const groups = map._legendLayerGroups
            const boundFeatures = []
            groups.forEach(group => {
                const layers = [
                    ...group.getLayers(),
                    ...group._ch.getHiddenLayers()
                ]
                layers.forEach(layer => {
                    const bounds = getLeafletLayerBounds(layer)
                    console.log(bounds)
                })
            })
        },
    }

    map._legendLayerGroups = Object.values(map._ch.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))
}