const toggleLeafletLayerEditor = async (layer, {
    dbIndexedKey,
} = {}) => {
    const map = layer?._group?._map
    if (!map) return
     
    const editableLayer = map._drawControl?.options?.edit?.featureGroup
    const enableEditor = editableLayer?._dbIndexedKey !== layer._dbIndexedKey

    const mapContainer = map.getContainer()
    const layerLegends = document.querySelector(`#${mapContainer.id}-panels-legend-layers`)
    const clientLayers = layer._group._handlers.getAllLayers()

    if (editableLayer) {
        const endEditingSession = (dbIndexedKey) => {
            if (dbIndexedKey !== editableLayer._dbIndexedKey) {
                deleteFromGISDB(editableLayer._dbIndexedKey)
            }
    
            clientLayers.forEach(i => {
                if (!i._dbIndexedKey.startsWith(id)) return
                i._dbIndexedKey = dbIndexedKey
    
                const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
                legend.querySelector(`.bi.bi-pencil-square`).remove()
            })
        }

        const [id, version] = editableLayer._dbIndexedKey.split('--version')
        const drawControlChanges = JSON.parse(localStorage.getItem(`draw-control-changes-${mapContainer.id}`) ?? '[]')
        const previousKey = `${id}--version${Number(version ?? 2)-1}`

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
                                alert.remove()
                                resolve()
                            }},
                        }),
                        discard: createButton({
                            className: `btn-danger ms-auto`,
                            innerText: 'Discard',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert.remove()
                                resolve(previousKey)
                            }},
                        }),
                        save: createButton({
                            className: `btn-success`,
                            innerText: 'Save',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert.remove()
                                resolve(editableLayer._dbIndexedKey)
                            }},
                        }),
                    }
                })
            })

            const newDBIndexedKey = await alertPromise
            if (newDBIndexedKey) {
                endEditingSession(newDBIndexedKey)
            } else {
                return
            }
        }
    }

    if (enableEditor) {
        const [id, version] = layer._dbIndexedKey.split('--version')
        const {gisData, queryExtent} = (await getFromGISDB(layer._dbIndexedKey)) ?? {
            gisData: turf.featureCollection([]),
            queryExtent: turf.feature([]).geometry,
        }
        const newDBIndexedKey = dbIndexedKey ?? await saveToGISDB(gisData, {
            id: `${id}--version${Number(version ?? 1)+1}`,
            queryExtent,
        })

        clientLayers.forEach(i => {
            if (!i._dbIndexedKey.startsWith(id)) return
            i._dbIndexedKey = newDBIndexedKey

            const legend = layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
            const title = legend.querySelector(`#${legend.id}-title`)
            title.insertBefore(customCreateElement({
                tag: 'i', 
                className:'bi bi-pencil-square'
            }), title.lastChild)
        })
    }

    handleLeafletDrawBtns(map, {
        include: enableEditor,
        targetLayer: layer
    })

    const geojson = enableEditor ? (await getFromGISDB(layer._dbIndexedKey))?.gisData : null

    for (const i of clientLayers) {
        if (editableLayer?._dbIndexedKey === i._dbIndexedKey) {
            updateLeafletGeoJSONLayer(i, {updateCache: false})
        }
        
        if (enableEditor && layer._dbIndexedKey === i._dbIndexedKey) {
            updateLeafletGeoJSONLayer(i, {geojson, updateCache: false})
        }
    }

    map._handlers.updateStoredLegendLayers()
}