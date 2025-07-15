const handleLeafletDrawBtns = (map, {
    include=true,
    targetLayer=L.geoJSON(),
} = {}) => {
    const drawControlChangesKey = `draw-control-changes-${map.getContainer().id}`
    
    const autoSaveDeletion = (e) => {
        const saveBtn = container.querySelector(`.leaflet-draw-actions.leaflet-draw-actions-bottom li a[title="Save changes"]`)
        saveBtn?.click()
    }

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
            featureGroup: targetLayer,
        }
    })

    drawControl._toggleEditBtn = (data) => {
        const editBtn = container.querySelector('.leaflet-draw-edit-edit')
        if (data.features.find(i => i.geometry.type.startsWith('Multi'))) {
            editBtn.classList.add('pe-none', 'text-secondary')
        } else {
            editBtn.classList.remove('pe-none', 'text-secondary')
        }
    }

    drawControl._addChange = (data) => {
        if (!data) return

        const current = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
        current.push(data)
        localStorage.setItem(drawControlChangesKey, JSON.stringify(current))
    }

    const container = drawControl.addTo(map)._container
    toggleMapInteractivity(map, {controls: [container]})

    
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

                    const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
                    gisData.features = [
                        ...gisData.features,
                        ...newFeatures
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._dbIndexedKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    targetLayer._group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })

                    drawControl._addChange({
                        type: 'created',
                        features: newFeatures
                    })

                    drawControl._toggleEditBtn(gisData)
                } catch (error) {
                    console.log(error)
                }
            }
        }
    })

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

                const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
                const lastChange = changes.pop()

                if (lastChange) {
                    const gisData = (await getFromGISDB(targetLayer._dbIndexedKey)).gisData
                    
                    if (lastChange.type === 'created') {
                        const gslIds = lastChange.features.map(i => i.properties.__gsl_id__)
                        gisData.features = gisData.features.filter(i => !gslIds.includes(i.properties.__gsl_id__))
                    }
                    
                    if (lastChange.type === 'deleted') {
                        gisData.features = [
                            ...gisData.features,
                            ...lastChange.features.map(i => i.old)
                        ]
                    }

                    if (lastChange.type === 'edited') {
                        const gslIds = lastChange.features.map(i => i.new.properties.__gsl_id__)
                        gisData.features = [
                            ...gisData.features.filter(i => !gslIds.includes(i.properties.__gsl_id__)),
                            ...lastChange.features.map(i => i.old)
                        ]
                    }

                    if (lastChange.type === 'restore') {
                        const [id, version] = targetLayer._dbIndexedKey.split('--version')
                        gisData.features = (await getFromGISDB(`${id}--version${lastChange.features[0].old}`)).gisData.features
                    }
                    
                    await saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._dbIndexedKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    targetLayer._group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })
                    
                    localStorage.setItem(drawControlChangesKey, JSON.stringify(changes))
                }
            }
        }
    })

    const restoreBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {
            href:'#', 
            'data-dbindexedkey-version': Number(targetLayer._dbIndexedKey.split('--version')[1])-1
        },
        className: 'leaflet-draw-misc-restore bi bi-skip-backward',
        events: {
            mouseover: async (e) => {
                const [id, version] = targetLayer._dbIndexedKey.split('--version')
                const currentVersion = Number(e.target.getAttribute('data-dbindexedkey-version'))
                const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                e.target.setAttribute('title', previousVersion ? `Restore to version ${previousVersion}` : `No older version to restore`)

            },
            click: async (e) => {
                const handler = async () => {
                    const [id, version] = targetLayer._dbIndexedKey.split('--version')
                    const currentVersion = Number(e.target.getAttribute('data-dbindexedkey-version'))
                    const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                    
                    if (!previousVersion) return
                    
                    e.target.setAttribute('data-dbindexedkey-version', previousVersion)
                    const {gisData, queryExtent} = await getFromGISDB(`${id}--version${previousVersion}`)

                    await saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._dbIndexedKey,
                        queryExtent,
                    })

                    targetLayer._group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })

                    drawControl._addChange({
                        type: 'restore',
                        features: [{
                            old: currentVersion, 
                            new: previousVersion
                        }]
                    })

                    drawControl._toggleEditBtn(gisData)
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

                const [id, version] = targetLayer._dbIndexedKey.split('--version')
                const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
                const newDBIndexedKey = await saveToGISDB(gisData, {
                    id: `${id}--version${Number(version ?? 1)+1}`,
                    queryExtent,
                })

                targetLayer._group._handlers.getAllLayers().forEach(i => {
                    if (!i._dbIndexedKey.startsWith(id)) return
                    i._dbIndexedKey = newDBIndexedKey
                })

                map._handlers.updateStoredLegendLayers()

                localStorage.removeItem(drawControlChangesKey)

                restoreBtn.setAttribute('data-dbindexedkey-version', targetLayer._dbIndexedKey.split('--version')[1]-1)
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

        if (btn.className.includes('polyline')) icon.classList.add('bi-slash-lg')
        if (btn.className.includes('polygon')) icon.classList.add('bi-pentagon')
        if (btn.className.includes('rectangle')) icon.classList.add('bi-square')
        if (btn.className.includes('marker')) icon.classList.add('bi-geo-alt')
        if (btn.className.includes('edit-edit')) icon.classList.add('bi-pencil-square')
        if (btn.className.includes('edit-remove')) icon.classList.add('bi-trash')
    })

    const drawEvents = {
        'created': async (e) => {
            const geojson = turf.featureCollection([e.layer.toGeoJSON()])
            
            if (!targetLayer._dbIndexedKey) return targetLayer.addData(geojson)
            
            await normalizeGeoJSON(geojson)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features.push(geojson.features[0])
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })

            drawControl._addChange({
                type: 'created',
                features: geojson.features
            })

            drawControl._toggleEditBtn(gisData)
        },
        'deleted': async (e) => {
            if (!targetLayer._dbIndexedKey) return
            
            const geojson = e.layers.toGeoJSON()
            const gslIds = geojson.features.map(i => i.properties.__gsl_id__)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features = gisData.features.filter(i => !gslIds.includes(i.properties.__gsl_id__))
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })
            
            drawControl._addChange({
                type: 'deleted',
                features: geojson.features.map(i => {
                    return {old: i, new: null}
                })
            })

            drawControl._toggleEditBtn(gisData)
        },
        'edited': async (e) => {
            if (!targetLayer._dbIndexedKey) return
            
            const features = e.layers.getLayers().map(i => {
                return {old: i.feature, new: i.toGeoJSON()}
            })
            const gslIds = features.map(i => i.old.properties.__gsl_id__)

            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features = [
                ...gisData.features.filter(i => !gslIds.includes(i.properties.__gsl_id__)),
                ...features.map(i => i.new)
            ]
            
            await saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })
    
            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })

            drawControl._addChange({
                type: 'edited',
                features,
            })

            drawControl._toggleEditBtn(gisData)
        },
        'editstart': (e) => {
            drawControl._editMode = true
        },
        'editstop': (e) => {
            drawControl._editMode = false
        },
        'deletestart': (e) => {
            drawControl._editMode = true
            map.getContainer().addEventListener('click', autoSaveDeletion)
        },
        'deletestop': (e) => {
            drawControl._editMode = false
            map.getContainer().removeEventListener('click', autoSaveDeletion)
        },
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
            drawControl?._toolbars?.edit?.disable?.()
        } catch (error) {
            console.log(error)
        }

        map.off('click', autoSaveDeletion)
        Object.keys(drawEvents).forEach(i => map.off(`draw:${i}`))
    }
    
    return drawControl
}