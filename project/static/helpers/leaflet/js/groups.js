const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(groupName => {
        const group = L.layerGroup()
        map._layerGroups[groupName] = group
        
        group._name = groupName
        group._hiddenLayers = []
        group._invisibileLayers = []
        group._ch = {
            getHiddenLayers: () => {
                return group._hiddenLayers
            },
            setHiddenLayers: (hiddenLayers=[]) => {
                group._hiddenLayers = hiddenLayers
            },
            addHiddenLayer: (layer) => {
                group._hiddenLayers.push(layer)
                group.removeLayer(layer)
            },
            getHiddenLayer: (id) => {
                return group._ch.getHiddenLayers().find(l => l._leaflet_id === id)
            },
            hasHiddenLayer: (layer) => {
                return group._ch.getHiddenLayers().includes(layer)
            },
            removeHiddenLayer: (layer, {addLayer=true}={}) => {
                let match
                
                const hiddenLayers = group._ch.getHiddenLayers().filter(l => {
                    const matched = l === layer
                    if (matched) match = l
                    return matched
                })
                group._ch.setHiddenLayers(hiddenLayers)
                
                addLayer ? group.addLayer(layer) : match ? map.fire('layerremove', {layer}) : null
            },
            clearHiddenLayers: ({silent=false}={}) => {
                const hiddenLayers = [...new group._ch.getHiddenLayers()]
                group._ch.setHiddenLayers()
                if (!silent) hiddenLayers.forEach(layer => map.fire('layerremove', {layer}))
            },

            getInvisibleLayers: () => {
                return group._invisibileLayers
            },
            getInvisibleLayer: (id) => {
                return group._ch.getInvisibleLayers().find(l => l._leaflet_id === id)
            },
            setInvisibleLayers: (invisibleLayers=[]) => {
                group._invisibileLayers = invisibleLayers
            },
            hasInvisibleLayer: (layer) => {
                return group._ch.getInvisibleLayers().includes(layer)
            },
            addInvisibleLayer: (layer) => {
                group._invisibileLayers.push(layer)
                group.removeLayer(layer)
            },
            removeInvisibleLayer: (layer, {addLayer=true}={}) => {
                let match
                
                const invisibleLayers = group._ch.getInvisibleLayers().filter(l => {
                    const matched = l === layer
                    if (matched) match = l
                    return matched
                })
                group._ch.setInvisibleLayers(invisibleLayers)
                
                addLayer ? group.addLayer(layer) : match ? map.fire('layerremove', {layer}) : null
            },
                
            getAllLayers: () => {
                return [
                    ...group.getLayers(),
                    ...group._ch.getHiddenLayers()
                ]
            },
            findLayer: (id) => {
                return group.getLayer(id) 
                || group._ch.getHiddenLayer(id) 
                || group._ch.getInvisibleLayer(id) 
            },
                    
            clearLayer: (layer) => {
                group.removeLayer(layer)
                group._ch.removeHiddenLayer(layer, {addLayer:false})
                group._ch.removeInvisibleLayer(layer, {addLayer:false})
                
                const paneName = layer.options.pane
                if (paneName.startsWith('custom')) {
                    deletePane(map, paneName)
                }
            },
            clearAllLayers: () => {
                group._ch.getAllLayers().forEach(l => group._ch.clearLayer(l))
            },
            hideAllLayers: () => {
                group.eachLayer(l => group._ch.addHiddenLayer(l))
            },
            showAllLayers: () => {
                group._ch.getHiddenLayers().forEach(l => group._ch.removeHiddenLayer(l))
            },
        }

        map.addLayer(group)
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
        hasInvisibleLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._ch.hasInvisibleLayer(layer)) return group
            }
        },
        hasHiddenLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                if (group._ch.getHiddenLayers().length) return true
            }
        },
        getLegendLayer: (id) => {
            for (const group of map._legendLayerGroups) {
                const layer = group._ch.findLayer(id)
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
        zoomToLegendLayers: async () => {
            let layers = []
            map._legendLayerGroups.forEach(group => {
                layers = layers.concat([
                    ...group.getLayers(), 
                    ...group._ch.getHiddenLayers()
                ]) 
            })

            const bounds = await Promise.all(
                layers.map(async layer => {
                    const b = await getLeafletLayerBounds(layer)
                    if (!b) return
            
                    if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
                        return turf.point([b.getEast(), b.getNorth()])
                    } else {
                        return L.rectangle(b).toGeoJSON()
                    }
                })
            );
            
            if (!bounds.length) return

            await zoomToLeafletLayer(L.geoJSON(turf.featureCollection(bounds)), map)
        },
    }

    map._legendLayerGroups = Object.values(map._ch.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))
}