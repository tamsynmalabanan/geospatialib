const handleLeafletLayerGroups = (map) => {
    map._layerGroups = {}
    Array('library', 'client', 'query', 'search').forEach(groupName => {
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
                if (!group._hiddenLayers.includes(layer)) {
                    group._hiddenLayers.push(layer)
                } 

                if (group.hasLayer(layer)) {
                    group.removeLayer(layer)
                } else {
                    map.fire('layerremove', {layer})
                }
            },
            getHiddenLayer: (id) => {
                return group._ch.getHiddenLayers().find(l => l._leaflet_id === parseInt(id))
            },
            hasHiddenLayer: (layer) => {
                return group._ch.getHiddenLayers().includes(layer)
            },
            removeHiddenLayer: async (layer, {addLayer=true}={}) => {
                let match
                
                const hiddenLayers = group._ch.getHiddenLayers().filter(l => {
                    const matched = l === layer
                    if (matched) {
                        match = l
                    }
                    return !matched
                })
                group._ch.setHiddenLayers(hiddenLayers)

                if (addLayer) {
                    group.addLayer(layer)
                } else if (match) {
                    map.fire('layerremove', {layer})
                }
            },

            getInvisibleLayers: () => {
                return group._invisibileLayers
            },
            getInvisibleLayer: (id) => {
                return group._ch.getInvisibleLayers().find(l => l._leaflet_id === parseInt(id))
            },
            setInvisibleLayers: (invisibleLayers=[]) => {
                group._invisibileLayers = invisibleLayers
            },
            hasInvisibleLayer: (layer) => {
                return group._ch.getInvisibleLayers().includes(layer)
            },
            addInvisibleLayer: (layer) => {
                group._invisibileLayers.push(layer)
                if (group.hasLayer(layer)) {
                    group.removeLayer(layer)
                } else {
                    map.fire('layerremove', {layer})
                }
            },
            removeInvisibleLayer: async (layer, {addLayer=true}={}) => {
                let match
                
                const invisibleLayers = group._ch.getInvisibleLayers().filter(l => {
                    const matched = l === layer
                    if (matched) match = l
                    return !matched
                })
                group._ch.setInvisibleLayers(invisibleLayers)

                if (addLayer && !group._ch.hasHiddenLayer(layer)) {
                    group.addLayer(layer)
                } else if (match) {
                    map.fire('layerremove', {layer})
                }
            },
                
            getAllLayers: () => {
                return [
                    ...group.getLayers(),
                    ...group._ch.getHiddenLayers(),
                    ...group._ch.getInvisibleLayers()
                ]
            },
            findLayer: (id) => {
                return group.getLayer(id) ?? group._ch.getHiddenLayer(id) ?? group._ch.getInvisibleLayer(id) 
            },
                    
            clearLayer: async (layer) => {
                if (group.hasLayer(layer)) group.removeLayer(layer)
                await group._ch.removeHiddenLayer(layer, {addLayer:false})
                await group._ch.removeInvisibleLayer(layer, {addLayer:false})
                
                const paneName = layer.options.pane
                if (paneName.startsWith('custom')) {
                    deletePane(map, paneName)
                }
            },
            clearAllLayers: async () => {
                group._ch.getAllLayers().forEach(async l => {
                    await group._ch.clearLayer(l)
                })
            },
            hideAllLayers: () => {
                Array(
                    ...group.getLayers(),
                    ...group._ch.getInvisibleLayers(),
                ).forEach(l => {
                    group._ch.addHiddenLayer(l)
                })
            },
            removeAllHiddenLayers: () => {
                group._ch.getHiddenLayers().forEach(l => group._ch.removeHiddenLayer(l))
            },
        }

        map.addLayer(group)
    })

    map._ch = {
        storedLegendLayersKey: `legend-layers-${map.getContainer().id}`,
        getStoredLegendLayers: () => JSON.parse(localStorage.getItem(map._ch.storedLegendLayersKey) ?? '{}'),
        updateStoredLegendLayers: ({handler, layer}={}) => {
            if (!handler && !layer) return

            const storedData = map._ch.getStoredLegendLayers()

            if (layer) {
                storedData[layer._leaflet_id] = {...(storedData[layer._leaflet_id] ?? {}), ...{
                    dbIndexedKey: layer._dbIndexedKey,
                    params: layer._params,
                    properties: layer._properties,
                    zIndex: map.getPanes()[layer.options.pane].style.zIndex,
                    isHidden: map._ch.hasHiddenLegendLayer(layer) ? true : false,
                    editable: layer === map._drawControl?.options?.edit?.featureGroup,
                }}
            }

            if (handler) {
                handler(storedData)
            }

            localStorage.setItem(map._ch.storedLegendLayersKey, JSON.stringify(storedData))
        },
        addStoredLegendLayers: async () => {
            const storedData = map._ch.getStoredLegendLayers()

            localStorage.removeItem(map._ch.storedLegendLayersKey)
            const cachedLayers = Object.values(storedData).sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
            for (i of cachedLayers) {
                await map._ch.addLegendLayer(i)
            }
        },
        addLegendLayer: async (layerData) => {
            let {dbIndexedKey, params, properties, zIndex, isHidden, data, editable} = layerData
            const group = map._ch.getLayerGroups()[(dbIndexedKey.startsWith('client') ? 'client' : 'library')]

            for (const i of Array(properties.symbology?.default, ...Object.values(properties.symbology?.groups ?? {}))) {
                if (i?.styleParams?.fillPattern !== 'icon') continue
                await handleStyleParams(i.styleParams)
            }

            if (data) {
                const {gisData, queryExtent} = data
                dbIndexedKey = saveToGISDB(gisData, {queryExtent})
            }

            const layer = await createLeafletLayer(params, {
                dbIndexedKey,
                group,
                add: false,
                properties
            })

            if (layer) {
                if (isHidden) group._ch.addHiddenLayer(layer)
                group.addLayer(layer)
                if (editable) await toggleLeafletLayerEditor(layer)
            }
        },
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
                if (group._ch.getAllLayers().includes(layer)) {
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
                    ... group._ch.getAllLayers(),
                ]
            }
            return layers
        },
        clearLegendLayers: async () => {
            map._legendLayerGroups.forEach(async group => {
                await group._ch.clearAllLayers()
            })
        },
        hideLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._ch.hideAllLayers()
            }
        },
        showLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._ch.removeAllHiddenLayers()
            }
        },
        zoomToLegendLayers: async () => {
            let layers = []
            map._legendLayerGroups.forEach(group => {
                layers = layers.concat(group._ch.getAllLayers()) 
            })

            const bounds = (await Promise.all(
                layers.map(async layer => {
                    const bbox = await getLeafletLayerBbox(layer)
                    const b = L.geoJSON(turf.bboxPolygon(bbox)).getBounds()
                    if (!b) return
                    
                    try {
                        if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
                            return turf.point([b.getEast(), b.getNorth()])
                        } else {
                            return L.rectangle(b).toGeoJSON()
                        }
                    } catch (error) {
                        return
                    }
                })
            )).filter(i => i)
            
            if (!bounds.length) return
            await zoomToLeafletLayer(L.geoJSON(turf.featureCollection(bounds)), map)
        },
    }

    map._legendLayerGroups = Object.values(map._ch.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))

    const queryPane = map.createPane('queryPane')
    queryPane.style.zIndex = 598

    const searchPane = map.createPane('searchPane')
    searchPane.style.zIndex = 599
}