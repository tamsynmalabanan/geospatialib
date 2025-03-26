const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
        
        layerGroup._name = group
        layerGroup._hiddenLayers = []
        layerGroup._customHandlers = {}

        layerGroup._customHandlers.getHiddenLayers = () => layerGroup._hiddenLayers
        
        layerGroup._customHandlers.hasHiddenLayer = (layer) => layerGroup._customHandlers.getHiddenLayers().includes(layer)

        layerGroup._customHandlers.getAllLayers = () => {
            return [
                ...layerGroup.getLayers(),
                ...layerGroup._customHandlers.getHiddenLayers()
            ]
        }

        layerGroup._customHandlers.getHiddenLayer = (id) => {
            for (const l of layerGroup._customHandlers.getHiddenLayers()) {
                if (l._leaflet_id === id) return l
            }
        }

        layerGroup._customHandlers.removeHiddenLayer = (layer, {silent=false}={}) => {
            const match = layerGroup._customHandlers.getHiddenLayers().find(l => l === layer)
            layerGroup._hiddenLayers = layerGroup._customHandlers.getHiddenLayers().filter(l => l !== layer)
            if (match && !silent) map.fire('layerremove', {layer})
        }

        layerGroup._customHandlers.clearHiddenLayers = ({silent=false}={}) => {
            layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(layer => {
                if (!silent) map.fire('layerremove', {layer})
            })
        }

        layerGroup._customHandlers.clearAllLayers = () => {
            layerGroup.clearLayers()
            layerGroup._customHandlers.clearHiddenLayers()
        }

        layerGroup._customHandlers.hideLayer = (layer) => {
            layerGroup._hiddenLayers.push(layer)
            layerGroup.removeLayer(layer)
        }

        layerGroup._customHandlers.hideAllLayers = () => {
            layerGroup.eachLayer(l => layerGroup._customHandlers.hideLayer(l))
        }

        layerGroup._customHandlers.showLayer = (layer) => {
            layerGroup._customHandlers.removeHiddenLayer(layer, {silent:true})
            layerGroup.addLayer(layer)
        }

        layerGroup._customHandlers.showAllLayers = () => {
            layerGroup._customHandlers.getHiddenLayers().forEach(l => layerGroup._customHandlers.showLayer(l))
        }

        layerGroup._customHandlers.getBounds = () => {
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
        }

        map.addLayer(layerGroup)
    })

    map.getLayerGroups = () => map._layerGroups 

    map.getLayerGroup = (layer) => {
        for (const group of Object.values(map.getLayerGroups())) {
            if (group.hasLayer(layer) || group._customHandlers.hasHiddenLayer(layer)) {
                return group
            }
        }
    }

    map._legendLayerGroups = Object.values(map.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))

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
            const bounds = group._customHandler.getBounds()
            if (bounds) return L.rectangle(bounds).toGeoJSON()
        }).filter(bound => bound)

        if (bounds.length) {
            map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
        }
    }
}