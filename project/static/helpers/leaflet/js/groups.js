const handleLeafletLayerGroups = async (map) => {   
    map._layerGroups = {}
    Array(
        'library',
        'local',
        'query',
        'search'
    ).forEach(groupName => {
        const group = L.layerGroup()
        map._layerGroups[groupName] = group
        
        group._name = groupName
        group._hiddenLayers = []
        group._invisibileLayers = []
        group._hiddenGroupLayers = []
        
        group._handlers = {
            getHiddenGroupLayers: () => group._hiddenGroupLayers,
            getHiddenGroupLayer: (id) => group._handlers.getHiddenGroupLayers().find(l => l._leaflet_id === parseInt(id)),
            hasHiddenGroupLayer: (layer) => group._handlers.getHiddenGroupLayers().includes(layer),
            unhideGroupLayer: async (layer, {addLayer=true}={}) => {
                let match
                
                const hiddenLayers = group._handlers.getHiddenGroupLayers().filter(l => {
                    const matched = l === layer
                    if (matched) { match = l }
                    return !matched
                })
                
                group._hiddenGroupLayers = hiddenLayers

                if (addLayer) {
                    group.addLayer(layer)
                } else if (match) {
                    map.fire('layerremove', {layer})
                }
            },
            hideGroupLayer: (layer) => {
                if (!group._hiddenGroupLayers.includes(layer)) group._hiddenGroupLayers.push(layer)
                group._map.hasLayer(layer) ? group.removeLayer(layer) : map.fire('layerremove', {layer})
            },

            getHiddenLayers: () => group._hiddenLayers,
            setHiddenLayers: (hiddenLayers=[]) => group._hiddenLayers = hiddenLayers,
            hideLayer: (layer) => {
                if (!group._hiddenLayers.includes(layer)) group._hiddenLayers.push(layer)
                if (group._map.hasLayer(layer)) {
                    group.removeLayer(layer)
                } else {
                    map.fire('layerremove', {layer})
                }
            },
            getHiddenLayer: (id) => group._handlers.getHiddenLayers().find(l => l._leaflet_id === parseInt(id)),
            hasHiddenLayer: (layer) => group._handlers.getHiddenLayers().includes(layer),
            unhideLayer: async (layer, {addLayer=true}={}) => {
                let match
                
                const hiddenLayers = group._handlers.getHiddenLayers().filter(l => {
                    const matched = l === layer
                    if (matched) { match = l }
                    return !matched
                })
                
                group._handlers.setHiddenLayers(hiddenLayers)

                if (addLayer) {
                    group.addLayer(layer)
                } else if (match) {
                    map.fire('layerremove', {layer})
                }
            },

            getInvisibleLayers: () =>  group._invisibileLayers,
            getInvisibleLayer: (id) => {
                return group._handlers.getInvisibleLayers().find(l => l._leaflet_id === parseInt(id))
            },
            setInvisibleLayers: (invisibleLayers=[]) => group._invisibileLayers = invisibleLayers,
            hasInvisibleLayer: (layer) => group._handlers.getInvisibleLayers().includes(layer),
            addInvisibleLayer: (layer) => {
                group._invisibileLayers.push(layer)
                if (group._map.hasLayer(layer)) {
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
                    ...group._handlers.getInvisibleLayers(),
                    ...group._handlers.getHiddenGroupLayers(),
                ]
            },
            findLayer: (id) => {
                return group.getLayer(id) ?? group._handlers.getHiddenLayer(id) ?? group._handlers.getInvisibleLayer(id) ?? group._handlers.getHiddenGroupLayer(id) 
            },
                    
            clearLayer: async (layer) => {
                if (group._map.hasLayer(layer)) group.removeLayer(layer)
                await group._handlers.unhideLayer(layer, {addLayer:false})
                await group._handlers.unhideGroupLayer(layer, {addLayer:false})
                await group._handlers.removeInvisibleLayer(layer, {addLayer:false})
                
                const paneName = layer.options.pane
                if (paneName.startsWith('custom')) {
                    deletePane(map, paneName)
                }

                if (groupName === 'local' && !map._handlers.getAllLegendLayers().find(i => i._dbIndexedKey === layer._dbIndexedKey)) {
                    if (layer._dbIndexedKey === map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey) {
                        toggleLeafletLayerEditor(layer)
                    }
                    
                    // const [id, version] = layer._dbIndexedKey.split('--version')
                    // const keys = await getAllGISDBKeys()
                    // keys.forEach(k => {
                    //     if (k.startsWith(id)) deleteFromGISDB(k)
                    // })
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
                    ...group._handlers.getHiddenGroupLayers(),
                ).forEach(l => {
                    group._handlers.hideLayer(l)
                })
            },
            removeAllHiddenLayers: () => {
                group._handlers.getHiddenLayers().forEach(l => group._handlers.unhideLayer(l))
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
            const group = map._handlers.getLayerGroups()[(dbIndexedKey.startsWith('local') ? 'local' : 'library')]

            for (const i of Array(properties.symbology?.default, ...Object.values(properties.symbology?.groups ?? {}))) {
                if (i?.styleParams?.fillPattern !== 'icon') continue
                await handleStyleParams(i.styleParams)
            }

            if (data) {
                const id = JSON.parse(dbIndexedKey.split('--version')[0].split(';')[1]).id
                if (!(await getAllGISDBKeys()).find(i => i.includes(id))) {
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
                if (isHidden) group._handlers.hideLayer(layer)

                const legendGroup = properties.legendGroup
                if (![undefined, 'layers'].includes(legendGroup.id) && legendGroup.checked === false) group._handlers.hideGroupLayer(layer)
                
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
                if (group.hasLayer(layer) || group._handlers.hasHiddenLayer(layer) || group._handlers.hasInvisibleLayer(layer) || group._handlers.hasHiddenLegendGroupLayer(layer)) {
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
        hasHiddenLegendGroupLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.hasHiddenGroupLayer(layer)) return group
            }
        },
        hasInvisibleLegendLayer: (layer) => {
            for (const group of map._legendLayerGroups) {
                if (group._handlers.hasInvisibleLayer(layer)) return group
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
    .filter(g => ['library', 'local'].includes(g._name))

    const queryPane = map.createPane('queryPane')
    queryPane.style.zIndex = 598

    const searchPane = map.createPane('searchPane')
    searchPane.style.zIndex = 599
}