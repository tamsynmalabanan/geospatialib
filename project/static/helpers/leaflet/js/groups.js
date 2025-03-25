const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query').forEach(group => {
        const layerGroup = L.layerGroup()
        map._layerGroups[group] = layerGroup
        layerGroup._name = group
        layerGroup._hiddenLayers = []

        layerGroup.getHiddenLayers = () => layerGroup._hiddenLayers
        
        layerGroup.hasHiddenLayer = (layer) => layerGroup.getHiddenLayers().includes(layer)

        layerGroup.getAllLayers = () => {
            return [
                ...layerGroup.getLayers(),
                ...layerGroup.getHiddenLayers()
            ]
        }

        layerGroup.getHiddenLayer = (id) => {
            for (const l of layerGroup.getHiddenLayers()) {
                if (l._leaflet_id === id) return l
            }
        }

        layerGroup.removeHiddenLayer = (layer, {silent=false}={}) => {
            const match = layerGroup.getHiddenLayers().find(l => l === layer)
            layerGroup._hiddenLayers = layerGroup.getHiddenLayers().filter(l => l !== layer)
            if (match && !silent) map.fire('layerremove', {layer})
        }

        layerGroup.clearHiddenLayers = ({silent=false}={}) => {
            layerGroup._hiddenLayers = layerGroup._hiddenLayers.filter(layer => {
                if (!silent) map.fire('layerremove', {layer})
            })
        }

        layerGroup.clearAllLayers = () => {
            layerGroup.clearLayers()
            layerGroup.clearHiddenLayers()
        }

        layerGroup.hideLayer = (layer) => {
            layerGroup._hiddenLayers.push(layer)
            layerGroup.removeLayer(layer)
        }

        layerGroup.hideAllLayers = () => {
            layerGroup.eachLayer(l => layerGroup.hideLayer(l))
        }

        layerGroup.showLayer = (layer) => {
            layerGroup.removeHiddenLayer(layer, {silent:true})
            layerGroup.addLayer(layer)
        }

        layerGroup.showAllLayers = () => {
            layerGroup.getHiddenLayers().forEach(l => layerGroup.showLayer(l))
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

    map._legendLayerGroups = Object.values(map.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))

    map.hasLegendLayer = (layer) => {
        for (const group of map._legendLayerGroups) {
            if (group.hasLayer(layer) || group.hasHiddenLayer(layer)) {
                return group
            }
        }
    }
    
    map.hasHiddenLegendLayer = (layer) => {
        for (const group of map._legendLayerGroups) {
            if (group.hasHiddenLayer(layer)) return group
        }
    }
    
    map.hasHiddenLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            if (group.getHiddenLayers().length) return true
        }
    }

    map.getLegendLayer = (id) => {
        for (const group of map._legendLayerGroups) {
            const layer = group.getLayer(id) || group.getHiddenLayer(id)
            if (layer) return layer
        }
    }
    
    map.getLegendLayers = () => {
        let layers = []
        for (const group of map._legendLayerGroups) {
            layers = [
                ...layers,
                ...group.getLayers(),
                ...group.getHiddenLayers()
            ]
        }
        return layers
    }
    
    map.clearLegendLayers = () => {
        map._legendLayerGroups.forEach(group => group.clearAllLayers())
    }
    
    map.hideLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            group.hideAllLayers()
        }
    }
    
    map.showLegendLayers = () => {
        for (const group of map._legendLayerGroups) {
            group.showAllLayers()
        }
    }

    map.zoomToLegendLayers = () => {
        const bounds = map._legendLayerGroups.map(group => {
            const bounds = group.getBounds()
            if (bounds) return L.rectangle(bounds).toGeoJSON()
        }).filter(bound => bound)

        if (bounds.length) {
            map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
        }
    }
}