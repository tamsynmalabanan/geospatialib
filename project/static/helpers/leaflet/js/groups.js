const handleLeafletLayerGroups = async (map) => {
    map._layerGroups = {}
    Array(
        'library',
        'client',
        'query',
        'search'
    ).forEach(groupName => {
        const group = L.layerGroup()
        map._layerGroups[groupName] = group
        
        group._name = groupName
        group._hiddenLayers = []
        group._invisibileLayers = []
      
        group._handlers = {
            getHiddenLayers: () => group._hiddenLayers,
            setHiddenLayers: (hiddenLayers=[]) => group._hiddenLayers = hiddenLayers,
            addToHiddenLayers: (layer) => {
                if (!group._hiddenLayers.includes(layer)) group._hiddenLayers.push(layer)
                group.hasLayer(layer) ? group.removeLayer(layer) : map.fire('layerremove', {layer})
            },
            getHiddenLayer: (id) => group._handlers.getHiddenLayers().find(l => l._leaflet_id === parseInt(id)),
            hasHiddenLayer: (layer) => group._handlers.getHiddenLayers().includes(layer),
            removeHiddenLayer: async (layer, {addLayer=true}={}) => {
                let match
                
                const hiddenLayers = group._handlers.getHiddenLayers().filter(l => {
                    const matched = l === layer
                    if (matched) {
                        match = l
                    }
                    return !matched
                })
                
                group._handlers.setHiddenLayers(hiddenLayers)

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
                return group._handlers.getInvisibleLayers().find(l => l._leaflet_id === parseInt(id))
            },
            setInvisibleLayers: (invisibleLayers=[]) => {
                group._invisibileLayers = invisibleLayers
            },
            hasInvisibleLayer: (layer) => {
                return group._handlers.getInvisibleLayers().includes(layer)
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
                
                const invisibleLayers = group._handlers.getInvisibleLayers().filter(l => {
                    const matched = l === layer
                    if (matched) match = l
                    return !matched
                })
                group._handlers.setInvisibleLayers(invisibleLayers)

                if (addLayer && !group._handlers.hasHiddenLayer(layer)) {
                    group.addLayer(layer)
                } else if (match) {
                    map.fire('layerremove', {layer})
                }
            },
                
            getAllLayers: () => {
                return [
                    ...group.getLayers(),
                    ...group._handlers.getHiddenLayers(),
                    ...group._handlers.getInvisibleLayers()
                ]
            },
            findLayer: (id) => {
                return group.getLayer(id) ?? group._handlers.getHiddenLayer(id) ?? group._handlers.getInvisibleLayer(id) 
            },
                    
            clearLayer: async (layer) => {
                if (group.hasLayer(layer)) group.removeLayer(layer)
                await group._handlers.removeHiddenLayer(layer, {addLayer:false})
                await group._handlers.removeInvisibleLayer(layer, {addLayer:false})
                
                const paneName = layer.options.pane
                if (paneName.startsWith('custom')) {
                    deletePane(map, paneName)
                }

                if (!map._handlers.getAllLegendLayers().find(i => i._dbIndexedKey === layer._dbIndexedKey)) {
                    if (layer._dbIndexedKey === map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey) {
                        toggleLeafletLayerEditor(layer)
                    }
                    
                    if (groupName === 'client') {
                        const [id, version] = layer._dbIndexedKey.split('--version')
                        const keys = await getAllGISDBKeys()
                        keys.forEach(k => {
                            if (k.startsWith(id)) deleteFromGISDB(k)
                        })
                    }
                }
            },
            clearAllLayers: async () => {
                group._handlers.getAllLayers().forEach(async l => {
                    await group._handlers.clearLayer(l)
                })
            },
            hideAllLayers: () => {
                Array(
                    ...group.getLayers(),
                    ...group._handlers.getInvisibleLayers(),
                ).forEach(l => {
                    group._handlers.addToHiddenLayers(l)
                })
            },
            removeAllHiddenLayers: () => {
                group._handlers.getHiddenLayers().forEach(l => group._handlers.removeHiddenLayer(l))
            },
        }

        map.addLayer(group)
    })

    map._handlers = {
        storedLegendLayersKey: `legend-layers-${map.getContainer().id}`,
        getStoredLegendLayers: () => JSON.parse(localStorage.getItem(map._handlers.storedLegendLayersKey) ?? '{}'),
        updateStoredLegendLayers: ({handler, layer}={}) => {
            const storedData = map._handlers.getStoredLegendLayers()

            const updateStoredLayerData = (layer) => {
                storedData[layer._leaflet_id] = {...(storedData[layer._leaflet_id] ?? {}), ...{
                    dbIndexedKey: layer._dbIndexedKey,
                    params: layer._params,
                    properties: layer._properties,
                    zIndex: map.getPanes()[layer.options.pane].style.zIndex,
                    isHidden: map._handlers.hasHiddenLegendLayer(layer) ? true : false,
                    editable: layer._dbIndexedKey === map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey,
                }}
            }

            if (layer) updateStoredLayerData(layer)

            if (handler) handler(storedData)

            if (!layer && !handler) map._handlers.getAllLegendLayers().forEach(layer => {
                updateStoredLayerData(layer)
            })

            localStorage.setItem(map._handlers.storedLegendLayersKey, JSON.stringify(storedData))
        },
        addStoredLegendLayers: async () => {
            const storedData = map._handlers.getStoredLegendLayers()

            localStorage.removeItem(map._handlers.storedLegendLayersKey)
            const cachedLayers = Object.values(storedData).sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
            for (i of cachedLayers) {
                await map._handlers.addLegendLayer(i)
            }
        },
        addLegendLayer: async (layerData) => {
            let {dbIndexedKey, params, properties, isHidden, data, editable} = layerData
            const group = map._handlers.getLayerGroups()[(dbIndexedKey.startsWith('client') ? 'client' : 'library')]

            for (const i of Array(properties.symbology?.default, ...Object.values(properties.symbology?.groups ?? {}))) {
                if (i?.styleParams?.fillPattern !== 'icon') continue
                await handleStyleParams(i.styleParams)
            }

            if (data) {
                const storedData = await getFromGISDB(dbIndexedKey)
                if (!storedData) {
                    const {gisData, queryExtent} = data
                    await saveToGISDB(gisData, {id:dbIndexedKey, queryExtent})
                }
            }

            const layer = await createLeafletLayer(params, {
                dbIndexedKey,
                group,
                add: false,
                properties
            })

            if (layer) {
                if (isHidden) group._handlers.addToHiddenLayers(layer)
                group.addLayer(layer)
                if (editable && (dbIndexedKey !== map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey)) {
                    await toggleLeafletLayerEditor(layer, {dbIndexedKey})
                }
            }
        },
        getLayerGroups: () => {
            return map._layerGroups
        },
        getLayerGroup: (layer) => {
            for (const group of Object.values(map._handlers.getLayerGroups())) {
                if (group.hasLayer(layer) || group._handlers.hasHiddenLayer(layer)) {
                    return group
                }
            }
        },
        hasLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.getAllLayers().includes(layer)) {
                    return group
                }
            }
        },
        hasHiddenLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.hasHiddenLayer(layer)) return group
            }
        },
        hasInvisibleLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.hasInvisibleLayer(layer)) return group
            }
        },
        hasHiddenLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.getHiddenLayers().length) return true
            }
        },
        getLegendLayer: (id) => {
            for (const group of map._legendLayerGroups) {
                const layer = group._handlers.findLayer(id)
                if (layer) return layer
            }
        },
        getLegendLayers: () => {
            let layers = []
            for (const group of map._legendLayerGroups) {
                layers = [
                    ...layers,
                    ... group._handlers.getAllLayers(),
                ]
            }
            return layers
        },
        clearLegendLayers: async () => {
            map._legendLayerGroups.forEach(async group => {
                await group._handlers.clearAllLayers()
            })
        },
        hideLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._handlers.hideAllLayers()
            }
        },
        showLegendLayers: () => {
            for (const group of map._legendLayerGroups) {
                group._handlers.removeAllHiddenLayers()
            }
        },
        getAllLegendLayers: () => {
            let layers = []
            map._legendLayerGroups.forEach(group => {
                layers = layers.concat(group._handlers.getAllLayers()) 
            })
            return layers
        },
        zoomToLegendLayers: async () => {
            const layers = map._handlers.getAllLegendLayers()

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

    map._legendLayerGroups = Object.values(map._handlers.getLayerGroups())
    .filter(g => ['library', 'client'].includes(g._name))

    const queryPane = map.createPane('queryPane')
    queryPane.style.zIndex = 598

    const searchPane = map.createPane('searchPane')
    searchPane.style.zIndex = 599
}