const toggleLeafletLayerEditor = async (layer, {
    indexedDBKey,
} = {}) => {
    const map = layer?._group?._map
    if (!map) return
     
    const editableLayer = map._drawControl?._targetLayer
    const enableEditor = editableLayer?._indexedDBKey !== layer._indexedDBKey

    const mapContainer = map.getContainer()
    const layerLegends = document.querySelector(`#${mapContainer.id}-panels-legend-layers`)
    const localLayers = layer._group._handlers.getAllLayers()

    
    if (editableLayer) {
        const properties = getDBKeyProperties(editableLayer._indexedDBKey)
        const drawControlChanges = JSON.parse(localStorage.getItem(`draw-control-changes-${mapContainer.id}`) ?? '[]')
        const previousKey = createLocalLayerDBKey({...properties, version: Number(properties.version ?? 2)-1})        
        
        const endEditingSession = (indexedDBKey) => {
            if (indexedDBKey !== editableLayer._indexedDBKey) {
                deleteFromGISDB(editableLayer._indexedDBKey)
            }
    
            layer._group._handlers.getAllLayers().forEach(i => {
                const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
                Array.from(legend?.querySelectorAll(`.bi.bi-pencil-square`) ?? []).forEach(i => i.remove())

                if (!i._indexedDBKey.includes(properties.id)) return
                i._indexedDBKey = indexedDBKey
            })
        }


        if (!drawControlChanges.length) {
            endEditingSession(previousKey)
        } else if (layer._group._handlers.getAllLayers().includes(editableLayer)) {
            const alertPromise = new Promise((resolve, reject) => {
                const alert = createModal({
                    titleText: 'Save layer changes?',
                    parent: document.body,
                    show: true,
                    static: true,
                    closeBtn: false,
                    centered: true,
                    contentBody: customCreateElement({
                        className: 'p-3',
                        innerHTML: `Do you want to save the ${formatNumberWithCommas(drawControlChanges.length)} change${drawControlChanges.length > 1 ? 's' : ''} made in "${editableLayer._params.title}"?`
                    }),
                    footerBtns: {
                        continue: createButton({
                            className: `btn-secondary`,
                            innerText: 'Continue editing',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert?.remove()
                                resolve()
                            }},
                        }),
                        discard: createButton({
                            className: `btn-danger ms-auto`,
                            innerText: 'Discard',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert?.remove()
                                resolve(previousKey)
                            }},
                        }),
                        save: createButton({
                            className: `btn-success`,
                            innerText: 'Save',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert?.remove()
                                resolve(editableLayer._indexedDBKey)
                            }},
                        }),
                    }
                })
            })

            const newIndexedDBKey = await alertPromise
            if (newIndexedDBKey) {
                endEditingSession(newIndexedDBKey)
            } else {
                return
            }
        }
    }

    if (enableEditor) {
        const properties = getDBKeyProperties(layer._indexedDBKey)
        const {gisData, queryExtent} = (await getFromGISDB(layer._indexedDBKey)) ?? {
            gisData: turf.featureCollection([]),
            queryExtent: turf.feature([]).geometry,
        }    
        const newIndexedDBKey = indexedDBKey ?? await saveToGISDB(gisData, {
            id: createLocalLayerDBKey({...properties, version: Number(properties.version ?? 1)+1}),
            queryExtent,
        })    
        
        localLayers.forEach(i => {
            if (!i._indexedDBKey.includes(properties.id)) return
            i._indexedDBKey = newIndexedDBKey
            
            const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
            if (legend.querySelector(`.bi.bi-pencil-square`)) return
            
            const title = legend.querySelector(`#${legend.id}-title`)
            title.lastChild.insertBefore(createIcon({
                preNone: false, 
                className:'bi bi-pencil-square',
                title: 'Active editing sessions',
            }), title.lastChild.firstChild)
        })    
    }    
    
    await handleLeafletDrawBtns(map, {
        include: enableEditor,
        targetLayer: layer
    })

    map._handlers.updateStoredLegendLayers()

    localLayers.forEach(i => {
        if (![editableLayer, layer].map(i => i?._indexedDBKey).includes(i._indexedDBKey)) return
        updateLeafletGeoJSONLayer(i, {updateLocalStorage: false})
    })
}