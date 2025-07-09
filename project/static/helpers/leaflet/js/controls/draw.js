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
            polygon: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)},
            rectangle: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)},
            marker: {icon: getLeafletLayerStyle({geometry: {type: 'point'}}, styleParams, {allowCircleMarker:false})},

            circle: false,
            circlemarker: false,
        },
        edit: {
            featureGroup: targetLayer,
        }
    })

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

    const undoBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Undo last change'},
        className: 'leaflet-draw-misc-restore bi-arrow-return-left',
        events: {
            click: async (e) => {
                e.preventDefault()

                const drawControlChangesKey = `draw-control-changes-${map.getContainer().id}`
                const changes = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
                const lastChange = changes.pop()

                if (lastChange) {
                    const gisData = (await getFromGISDB(targetLayer._dbIndexedKey)).gisData
                    
                    if (lastChange.type === 'created') {
                        gisData.features = gisData.features.filter(i => i.properties.__gsl_id__ !== lastChange.features[0].new.properties.__gsl_id__)
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
                        gisData.features = lastChange.features[0].old
                    }
                    
                    saveToGISDB(turf.clone(gisData), {
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
            'data-dbindexedkey-version': targetLayer._dbIndexedKey.split('--version')[1]
        },
        className: 'leaflet-draw-misc-restore bi-skip-backward',
        events: {
            mouseover: async (e) => {
                const [id, version] = targetLayer._dbIndexedKey.split('--version')
                const currentVersion = Number(e.target.getAttribute('data-dbindexedkey-version'))
                const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                e.target.setAttribute('title', previousVersion ? `Restore to version ${previousVersion}` : `No older version to restore`)
            },
            click: async (e) => {
                e.preventDefault()
                
                const oldFeatures = (await getFromGISDB(targetLayer._dbIndexedKey)).gisData.features

                const [id, version] = targetLayer._dbIndexedKey.split('--version')
                const currentVersion = Number(e.target.getAttribute('data-dbindexedkey-version'))
                const previousVersion = (await getAllGISDBKeys()).filter(i => i.startsWith(id)).map(i => Number(i.split('--version')[1])).filter(i => i < currentVersion).sort((a, b) => a - b).pop()
                
                if (previousVersion) {
                    e.target.setAttribute('data-dbindexedkey-version', previousVersion)
                    const {gisData, queryExtent} = await getFromGISDB(`${id}--version${previousVersion}`)
    
                    saveToGISDB(turf.clone(gisData), {
                        id: targetLayer._dbIndexedKey,
                        queryExtent,
                    })
    
                    targetLayer._group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })
    
                    updateDrawControlChanges({
                        type: 'restore',
                        features: [{
                            old: oldFeatures, 
                            new: gisData.features
                        }]
                    })
                }
            }
        }
    })

    const saveBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Save changes'},
        className: 'leaflet-draw-misc-restore bi-floppy',
        events: {
            click: async (e) => {
                e.preventDefault()

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

                const drawControlChangesKey = `draw-control-changes-${map.getContainer().id}`
                localStorage.removeItem(drawControlChangesKey)
            }
        }
    })

    const disableBtn = customCreateElement({
        tag: 'a',
        parent: bar,
        attrs: {href:'#', title: 'Disable layer editor'},
        className: 'leaflet-draw-misc-restore bi-x-lg',
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
        btn.classList.add(`text-bg-${getPreferredTheme()}`, 'border-0', 'd-flex', 'justify-content-center', 'align-items-center', 'bi')
        btn.style.backgroundImage = 'none'
        btn.style.height = '32px'
        btn.style.width = '32px'

        if (btn.className.includes('polyline')) btn.classList.add('bi-slash-lg')
        if (btn.className.includes('polygon')) btn.classList.add('bi-pentagon')
        if (btn.className.includes('rectangle')) btn.classList.add('bi-square')
        if (btn.className.includes('marker')) btn.classList.add('bi-geo-alt')
        if (btn.className.includes('edit-edit')) btn.classList.add('bi-pencil-square')
        if (btn.className.includes('edit-remove')) btn.classList.add('bi-trash')
    })

    const updateDrawControlChanges = (data) => {
        if (!data) return

        const current = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
        current.push(data)
        localStorage.setItem(drawControlChangesKey, JSON.stringify(current))
    }

    const drawEvents = {
        'created': async (e) => {
            const geojson = turf.featureCollection([e.layer.toGeoJSON()])
            
            if (!targetLayer._dbIndexedKey) return targetLayer.addData(geojson)
            
            await normalizeGeoJSON(geojson)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features.push(geojson.features[0])
            
            saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })

            updateDrawControlChanges({
                type: 'created',
                features: [{
                    old: null, 
                    new: geojson.features[0]
                }]
            })
        },
        'deleted': async (e) => {
            if (!targetLayer._dbIndexedKey) return
            
            const geojson = e.layers.toGeoJSON()
            const gslIds = geojson.features.map(i => i.properties.__gsl_id__)
            
            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features = gisData.features.filter(i => !gslIds.includes(i.properties.__gsl_id__))
            
            saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })

            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })
            
            updateDrawControlChanges({
                type: 'deleted',
                features: geojson.features.map(i => {
                    return {old: i, new: null}
                })
            })
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
            
            saveToGISDB(turf.clone(gisData), {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
            })
    
            targetLayer._group.getLayers().forEach(i => {
                if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
                updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
            })

            updateDrawControlChanges({
                type: 'edited',
                features,
            })
        },
        'editstart': (e) => {
            drawControl._preventUpdate = true
        },
        'editstop': (e) => {
            drawControl._preventUpdate = false
        },
        'deletestart': (e) => {
            drawControl._preventUpdate = true
        },
        'deletestop': (e) => {
            drawControl._preventUpdate = false
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
        Object.keys(drawEvents).forEach(i => map.off(`draw:${i}`))
    }
    
    return drawControl
}