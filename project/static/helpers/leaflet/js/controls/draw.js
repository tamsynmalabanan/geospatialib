const handleLeafletDrawBtns = (map, {
    include=true,
    targetLayer=L.geoJSON(),
} = {}) => {
    const drawControlChangesKey = `draw-control-changes-${map.getContainer().id}`
    
    if (map._drawControl) {
        map.removeControl(map._drawControl)
        delete map._drawControl
        localStorage.removeItem(drawControlChangesKey)
    }

    if (!include) return

    const styleParams = getLeafletStyleParams({fillColor: 'hsla(60, 100%, 50%, 1)', strokeWidth: 3})

    const drawControl = map._drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polyline: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polyline'}}, styleParams)},
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#b700ffff',
                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)
            },
            rectangle: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)},
            marker: {icon: getLeafletLayerStyle({geometry: {type: 'point'}}, styleParams, {allowCircleMarker:false})},

            circle: false,
            circlemarker: false,
        },
        edit: {
            featureGroup: L.geoJSON(),
            remove: false,
        }
    })

    drawControl._targetLayer = targetLayer
    
    drawControl._addChange = async (data) => {
        if (!data) return

        try {
            const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
            changes.push(data)
            localStorage.setItem(drawControlChangesKey, JSON.stringify(changes))
        } catch (error) {
            const alertPromise = new Promise((resolve, reject) => {
                const alert = createModal({
                    titleText: 'Change will not be backed up.',
                    parent: document.body,
                    show: true,
                    static: true,
                    closeBtn: false,
                    centered: true,
                    contentBody: customCreateElement({
                        className: 'p-3',
                        innerHTML: `Recent change will not be backed up and therefore cannot be undone later via the <b>Undo</b> button. Do you want to keep the change or undo it now?`
                    }),
                    footerBtns: {
                        undo: createButton({
                            className: `btn-secondary ms-auto`,
                            innerText: 'Undo',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert?.remove()
                                resolve(false)
                            }},
                        }),
                        keep: createButton({
                            className: `btn-success`,
                            innerText: 'Keep',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert?.remove()
                                resolve(true)
                            }},
                        }),
                    }
                })
            })
            
            const keepChange = await alertPromise
            if (!keepChange) undoLastChange({lastChange:data})
        }
    }

    const container = drawControl.addTo(map)._container
    toggleMapInteractivity(map, {controls: [container]})

    drawControl._toggleFeatureEdit = ({feature}={}) => {
        const editableLayer = drawControl.options.edit.featureGroup
        const editBtn = drawControl._toolbars.edit._modes.edit.button
        
        if (feature) {
            const layer = L.geoJSON(feature).getLayers()[0]
            layer.addTo(editableLayer)
            editableLayer.addTo(map)
            
            removeTooltip(editBtn)
            editBtn.classList.remove('text-secondary')
            editBtn.click()
        } else {
            editableLayer.clearLayers()
            editableLayer.removeFrom(map)
            
            editBtn.classList.add('text-secondary')
            titleToTooltip(editBtn, 'Right-click on a feature and select <b>Edit geometry</b> to edit.')
        }
    }
    
    drawControl._toggleFeatureEdit()
    
    drawControl._explodeFeatureGeometry = async (feature) => {
        try {
            let newGeoJSON = turf.featureCollection([turf.clone(feature)])
            for (const handler of Array('flatten', 'unkinkPolygon')) {
                newGeoJSON = turf[handler](newGeoJSON)
            }

            const newFeatures = (await normalizeGeoJSON(newGeoJSON)).features
            if (newFeatures.length > 1) {
                for (const index in newFeatures) {
                    const newFeature = newFeatures[index]
                    const metadata = newFeature.metadata = newFeature.metadata ?? {}
                    
                    const prefix = `explode_index`
                    let propKey = prefix
                    let count = 0
                    while (Object.keys(metadata).includes(propKey)) {
                        count +=1
                        propKey = `${prefix}_${count}`
                    }
                    
                    metadata[propKey] = index
                    metadata[`exploded_feature${count ? `_${count}` : ''}`] = feature.metadata.gsl_id
                    
                    await generateFeatureMetadataId(newFeature)
                }
            }
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
            gisData.features = [
                ...gisData.features.filter(i => i.metadata.gsl_id !== feature.metadata.gsl_id),
                ...newFeatures
            ]
    
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._indexedDBKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })
    
            targetLayer._group.getLayers().forEach(i => {
                if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
            })
    
            drawControl._addChange({
                type: 'edited',
                features: newFeatures.map(i => {
                    return {new: i, old: feature}
                })
            })
        } catch (error) {
            console.log(error)
        }
    }
    
    const section = customCreateElement({
        parent: container,
        className: 'leaflet-draw-section'
    })

    const bar = customCreateElement({
        parent: section,
        className: 'leaflet-draw-toolbar leaflet-bar'
    })

    const pasteBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Paste features'},
        className: 'leaflet-draw-misc-restore bi bi-clipboard-plus',
        events: {
            click: async (e) => {
                e.preventDefault()

                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    let newFeatures = JSON.parse(text)
                    if (newFeatures.type === 'FeatureCollection') newFeatures = newFeatures.features
                    if (newFeatures.type === 'Feature') newFeatures = [newFeatures]
                    if (Object.keys(newFeatures).length === 2 && newFeatures.type && newFeatures.coordinates) newFeatures = [turf.feature(newFeatures)]
                    if (!Array.isArray(newFeatures)) return

                    newFeatures = (await normalizeGeoJSON(turf.featureCollection(newFeatures))).features
    
                    const copyId = generateRandomString()
                    newFeatures.forEach(async f => {
                        const metadata = f.metadata = f.metadata ?? {}
                        const prefix = `copied_feature`
                        let propKey = prefix

                        let count = 0
                        while (Object.keys(metadata).includes(propKey)) {
                            count +=1
                            propKey = `${prefix}_${count}`
                        }
                        
                        metadata[propKey] = metadata.gsl_id ?? ''
                        metadata[`copy_id${count ? `_${count}` : ''}`] = copyId
                        
                        await generateFeatureMetadataId(f)
                    })

                    const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
                    gisData.features = [
                        ...gisData.features,
                        ...newFeatures
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._indexedDBKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    targetLayer._group.getLayers().forEach(i => {
                        if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                    })

                    drawControl._addChange({
                        type: 'created',
                        features: newFeatures.map(i => i.metadata.gsl_id)
                    })
                } catch (error) {
                    console.log(error)
                }
            }
        }
    })

    const undoLastChange = async ({lastChange}={}) => {
        if (!lastChange) {
            const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
            lastChange = changes.pop()
            localStorage.setItem(drawControlChangesKey, JSON.stringify(changes))
        }

        if (!lastChange) return

        const gisData = (await getFromGISDB(targetLayer._indexedDBKey)).gisData
        
        if (lastChange.type === 'created') {
            gisData.features = gisData.features.filter(i => !lastChange.features.includes(i.metadata.gsl_id))
        }
        
        if (lastChange.type === 'deleted') {
            gisData.features = [
                ...gisData.features,
                ...lastChange.features.map(i => i.old)
            ]
        }

        if (lastChange.type === 'edited') {
            const gslIds = lastChange.features.map(i => i.new.metadata.gsl_id)
            
            const oldFeatures = {}
            lastChange.features.forEach(i => oldFeatures[i.old.metadata.gsl_id] = i.old)
            
            gisData.features = [
                ...gisData.features.filter(i => !gslIds.includes(i.metadata.gsl_id)),
                ...Object.values(oldFeatures)
            ]
        }

        if (lastChange.type === 'restore') {
            const [id, version] = targetLayer._indexedDBKey.split('--version')
            gisData.features = (await getFromGISDB(`${id}--version${lastChange.features[0].old}`)).gisData.features
        }
        
        await saveToGISDB(turf.clone(gisData), {
            id: targetLayer._indexedDBKey,
            queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
        })

        targetLayer._group.getLayers().forEach(i => {
            if (i._indexedDBKey !== targetLayer._indexedDBKey) return
            updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
        })
        
        
    }

    const undoBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#'},
        className: 'leaflet-draw-misc-restore bi bi-arrow-return-left',
        events: {
            mouseover: async (e) => {
                const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
                e.target.setAttribute('title', changes.length ? `Undo last change` : `No changes to undo`)
            },
            click: async (e) => {
                e.preventDefault()
                await undoLastChange()
            }
        }
    })

    const restoreBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {
            href:'#', 
            'data-indexeddbkey-version': Number(targetLayer._indexedDBKey.split('--version')[1])-1
        },
        className: 'leaflet-draw-misc-restore bi bi-skip-backward',
        events: {
            mouseover: async (e) => {
                const [id, version] = targetLayer._indexedDBKey.split('--version')
                const currentVersion = Number(e.target.getAttribute('data-indexeddbkey-version'))
                const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                e.target.setAttribute('title', previousVersion ? `Restore to version ${previousVersion}` : `No older version to restore`)

            },
            click: async (e) => {
                const handler = async () => {
                    const [id, version] = targetLayer._indexedDBKey.split('--version')
                    const currentVersion = Number(e.target.getAttribute('data-indexeddbkey-version'))
                    const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                    
                    if (!previousVersion) return
                    
                    e.target.setAttribute('data-indexeddbkey-version', previousVersion)
                    const {gisData, queryExtent} = await getFromGISDB(`${id}--version${previousVersion}`)

                    await saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._indexedDBKey,
                        queryExtent,
                    })

                    targetLayer._group.getLayers().forEach(i => {
                        if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                    })

                    drawControl._addChange({
                        type: 'restore',
                        features: [{
                            old: currentVersion, 
                            new: previousVersion
                        }]
                    })
                }

                e.preventDefault()
                
                const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
                if (changes.length) {
                    const alert = contextMenuHandler(e, {
                        confirm: {
                            innerText: `There are unsaved changes. Confirm to restore previous version?`,
                            btnCallback: handler
                        },            
                    })
                    alert.classList.add('bg-danger')
                } else {
                    handler()
                }
            }
        }
    })

    const saveBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Save changes'},
        className: 'leaflet-draw-misc-restore bi bi-floppy',
        events: {
            click: async (e) => {
                e.preventDefault()

                const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
                if (!changes.length) return

                const [id, version] = targetLayer._indexedDBKey.split('--version')
                const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
                const newIndexedDBKey = await saveToGISDB(gisData, {
                    id: `${id}--version${Number(version ?? 1)+1}`,
                    queryExtent,
                })

                targetLayer._group._handlers.getAllLayers().forEach(i => {
                    if (!i._indexedDBKey.startsWith(id)) return
                    i._indexedDBKey = newIndexedDBKey
                })

                map._handlers.updateStoredLegendLayers()

                localStorage.removeItem(drawControlChangesKey)

                restoreBtn.setAttribute('data-indexeddbkey-version', targetLayer._indexedDBKey.split('--version')[1]-1)
            }
        }
    })

    const disableBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Disable layer editor'},
        className: 'leaflet-draw-misc-restore bi bi-x-lg',
        events: {
            click: async (e) => {
                e.preventDefault()
                await toggleLeafletLayerEditor(targetLayer)
            }
        }
    })

    Array.from(container.querySelectorAll('.leaflet-bar')).forEach(i => {
        i.classList.add('border-0', 'shadow-lg')
        i.firstChild?.classList.add('rounded-top')
        i.lastChild?.classList.add('rounded-bottom')
    })
    
    Array.from(container.querySelectorAll('a')).forEach(btn => {
        btn.classList.add(`text-bg-${getPreferredTheme()}`, 'border-0', 'd-flex', 'justify-content-center', 'align-items-center')
        btn.style.backgroundImage = 'none'
        btn.style.height = '32px'
        btn.style.width = '32px'

        const icon = customCreateElement({
            parent: btn,
            tag: 'i',
            className: 'pe-none bi'
        })

        if (btn.className.includes('polyline')) icon.classList.add('bi-bezier2')
        if (btn.className.includes('polygon')) icon.classList.add('bi-pentagon')
        if (btn.className.includes('rectangle')) icon.classList.add('bi-square')
        if (btn.className.includes('marker')) icon.classList.add('bi-geo-alt')
        if (btn.className.includes('edit-edit')) icon.classList.add('bi-pencil-square')
        if (btn.className.includes('edit-remove')) icon.classList.add('bi-trash')
    })

    const drawEvents = {
        'created': async (e) => {
            const geojson = turf.featureCollection([e.layer.toGeoJSON()])
            
            if (!targetLayer._indexedDBKey) return targetLayer.addData(geojson)
            
            await normalizeGeoJSON(geojson)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
            gisData.features.push(geojson.features[0])
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._indexedDBKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
            })

            drawControl._addChange({
                type: 'created',
                features: geojson.features.map(i => i.metadata.gsl_id)
            })
        },
        'deleted': async (e) => {
            e.layer.removeFrom(targetLayer)
            if (!targetLayer._indexedDBKey) return
            
            const geojson = turf.featureCollection([e.layer.toGeoJSON()])
            const gslIds = geojson.features.map(i => i.metadata.gsl_id)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
            gisData.features = gisData.features.filter(i => !gslIds.includes(i.metadata.gsl_id))
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._indexedDBKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
            })
            
            drawControl._addChange({
                type: 'deleted',
                features: geojson.features.map(i => {
                    return {old: i, new: null}
                })
            })
        },
        'edited': async (e) => {
            if (!targetLayer._indexedDBKey) return

            const features = []
            for (const i of e.layers.getLayers()) {
                const newFeature = (await normalizeGeoJSON(turf.featureCollection([i.toGeoJSON()]))).features[0]
                features.push({old: i.feature, new: newFeature})
            }

            const gslIds = features.map(i => i.old.metadata.gsl_id)

            const {gisData, queryExtent} = await getFromGISDB(targetLayer._indexedDBKey)
            gisData.features = [
                ...gisData.features.filter(i => !gslIds.includes(i.metadata.gsl_id)),
                ...features.map(i => i.new)
            ]
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._indexedDBKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })
    
            targetLayer._group.getLayers().forEach(i => {
                if (i._indexedDBKey !== targetLayer._indexedDBKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
            })

            drawControl._addChange({
                type: 'edited',
                features,
            })
        },
        'editstart': (e) => {
        },
        'editstop': (e) => {
            drawControl._toggleFeatureEdit()
        },
        // 'deletestart': (e) => {
        //     map.getContainer().addEventListener('click', autoSaveDeletion)
        // },
        // 'deletestop': (e) => {
        //     map.getContainer().removeEventListener('click', autoSaveDeletion)
        // },
        // 'drawstart': (e) => {
        //     disableMapInteractivity(map)
        // },
        // 'drawstop': (e) => {
        //     enableMapInteractivity(map)
        // },
    }

    Object.keys(drawEvents).forEach(i => map.on(`draw:${i}`, drawEvents[i]))
    drawControl.onRemove = (map) => {
        try {
            drawControl?._toolbars?.draw?.disable?.()
            drawControl?._toolbars?.edit?.disable?.()
        } catch (error) {
            console.log(error)
        }

        // map.off('click', autoSaveDeletion)
        drawControl._toggleFeatureEdit()
        Object.keys(drawEvents).forEach(i => map.off(`draw:${i}`))
    }
    
    return drawControl
}