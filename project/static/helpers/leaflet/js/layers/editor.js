const toggleLeafletLayerEditor = async (layer, {
    indexedDBKey,
} = {}) => {
    const map = layer?._group?._map
    if (!map) return
     
    const editableLayer = map._drawControl?.options?.edit?.featureGroup
    const enableEditor = editableLayer?._indexedDBKey !== layer._indexedDBKey

    const mapContainer = map.getContainer()
    const layerLegends = document.querySelector(`#${mapContainer.id}-panels-legend-layers`)
    const localLayers = layer._group._handlers.getAllLayers()

    
    if (editableLayer) {
        const [id, version] = editableLayer._indexedDBKey.split('--version')
        const drawControlChanges = JSON.parse(localStorage.getItem(`draw-control-changes-${mapContainer.id}`) ?? '[]')
        const previousKey = `${id}--version${Number(version ?? 2)-1}`
        
        const endEditingSession = (indexedDBKey) => {
            if (indexedDBKey !== editableLayer._indexedDBKey) {
                deleteFromGISDB(editableLayer._indexedDBKey)
            }
    
            localLayers.forEach(i => {
                if (!i._indexedDBKey.startsWith(id)) return
                i._indexedDBKey = indexedDBKey
    
                const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
                legend.querySelector(`.bi.bi-pencil-square`)?.remove()
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
        const [id, version] = layer._indexedDBKey.split('--version')
        const {gisData, queryExtent} = (await getFromGISDB(layer._indexedDBKey)) ?? {
            gisData: turf.featureCollection([]),
            queryExtent: turf.feature([]).geometry,
        }    
        const newIndexedDBKey = indexedDBKey ?? await saveToGISDB(gisData, {
            id: `${id}--version${Number(version ?? 1)+1}`,
            queryExtent,
        })    
        
        localLayers.forEach(i => {
            if (!i._indexedDBKey.startsWith(id)) return
            i._indexedDBKey = newIndexedDBKey
            
            const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
            const title = legend.querySelector(`#${legend.id}-title`)
            title.insertBefore(customCreateElement({
                tag: 'i', 
                className:'bi bi-pencil-square'
            }), title.lastChild)    
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

    map._drawControl?._toggleEditBtn((await getFromGISDB(layer._indexedDBKey)).gisData)
}