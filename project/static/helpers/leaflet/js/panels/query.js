const handleLeafletQueryPanel = (map, parent) => {
    let controller = resetController()

    const toolHandler = async (e, handler) => {
        await clearLayers(tools)
        
        if (typeof handler !== 'function') return

        controller = resetController({controller, message: 'New query started.'})

        spinner.classList.remove('d-none')
        
        const cancelBtn = getCancelBtn()
        cancelBtn.disabled = false

        errorRemark = 'Query was interrupted.'

        await handler(e, {
            controller,
            abortBtns: [getCancelBtn()], 
        })
    
        cancelBtn.disabled = true
        
        spinner.classList.add('d-none')
        
        if (layers.innerHTML === '') {
            error.lastChild.innerText = errorRemark
            error.classList.remove('d-none')
        }
    }

    const queryGroup = map._handlers.getLayerGroups().query
    const {
        toolbar, 
        layers,
        status,
        spinner,
        error,
        clearLayers,
        toolsHandler,
    } = createLeafletMapPanel(map, parent, 'query', {
        statusBar: true,
        spinnerRemark: 'Running query...',
        clearLayersHandler: () => queryGroup.clearLayers(),
        toolHandler,
    })

    const customStyleParams = {
        fillColor: 'hsla(111, 100%, 54%, 1)',
        strokeWidth: 1,
    }

    let errorRemark

    const getCancelBtn = () => toolbar.querySelector(`#${toolbar.id}-cancel`)

    const enableToolbar = () => {
        toolbar.querySelector(`#${toolbar.id}-clear`).disabled = false

        if (layers.querySelectorAll('.collapse').length) {
            toolbar.querySelector(`#${toolbar.id}-collapse`).disabled = false
        }
        
        const checkboxes = layers.querySelectorAll('input.form-check-input[type="checkbox"]')
        if (checkboxes.length) {
            toolbar.querySelector(`#${toolbar.id}-zoomin`).disabled = false
            if (Array.from(checkboxes).some(c => !c.disabled)) {
                toolbar.querySelector(`#${toolbar.id}-visibility`).disabled = false
            }
        }

        layers.classList.remove('d-none')
    }

    const getOSMDataFetchers = ({types=ALL_OVERPASS_ELEMENT_TYPES, tags=''}={}) => {
        return [
            {key: 'nominatim;{}', title: 'osm element via nominatim',},
            {key: `overpass;${JSON.stringify({types,tags})}`, title: `osm ${
                types.map(i => `${i}s`).join(', ')
            } ${
                tags ? `for ${tags.replaceAll('"','').replaceAll('[','').split(']').filter(i => i).join(', ')}` : ''
            } via overpass`,},
        ]
    } 

    const dataToChecklist = async (fetchers, {queryGeom, abortBtns, controller, event}={}) => {
        for (const fetcher of fetchers) {
            const geojson = await getGeoJSON(fetcher.key, {
                queryGeom,
                zoom: map.getZoom(),
                abortBtns, 
                controller,
                sort:true,
                event,
            })

            if (!geojson?.features) continue

            if (!geojson.features.length) {
                errorRemark = 'Query returned no results.'
            }
        
            const layer = await getLeafletGeoJSONLayer({
                geojson,
                pane: 'queryPane',
                group: queryGroup,
                customStyleParams,
                params: {
                    title: fetcher.title,
                    attribution: createAttributionTable(geojson)?.outerHTML,
                    type: 'geojson',
                }
            })

            const content = createGeoJSONChecklist(layer, {controller})
            if (content) {
                layers.appendChild(content)
                enableToolbar()
            }
        }
    }

    const tools = toolsHandler({
        locationCoords: {
            iconSpecs: 'bi-geo-alt-fill',
            title: 'Query point coordinates',
            altShortcut: 'q',
            mapClickHandler: async (e) => {
                const feature = turf.point(Object.values(e.latlng).reverse())
                
                queryGroup.addLayer((await getLeafletGeoJSONLayer({
                    geojson: feature, 
                    pane: 'queryPane',
                    group: queryGroup,
                    customStyleParams,
                })))

                const content = createPointCoordinatesTable(feature, {precision:6})
                layers.appendChild(content)
                if (layers.classList.contains('d-none')) enableToolbar()
            },
        },
        osmPoint: {
            iconSpecs: 'bi-pin-map-fill',
            title: 'Query OSM at point',
            altShortcut: 'w',
            mapClickHandler: async (e, {abortBtns, controller} = {}) => {
                const queryGeom = turf.point(Object.values(e.latlng).reverse())
                await dataToChecklist(getOSMDataFetchers(), {queryGeom, abortBtns, controller})
            }
        },
        osmView: {
            iconSpecs: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            altShortcut: 'e',
            toolHandler: false,
            btnClickHandler: async (e, {abortBtns, controller} = {}) => {
                const container = customCreateElement({
                    className: 'px-3 fs-12 flex-column d-flex gap-2'
                })

                const checkboxes = createCheckboxOptions({
                    parent: container,
                    containerClass: 'gap-3',
                    options: {
                        'node': {
                            checked: true,
                        },
                        'way': {
                            checked: true,
                        },
                        'relation': {
                            checked: true,
                        },
                    }
                })

                const filterField = createFormFloating({
                    parent: container,
                    fieldAttrs: {name:'overpassTag'},
                    labelText: 'Overpass tag/s',
                })

                const link = customCreateElement({
                    parent: container,
                    tag: 'span',
                    attrs: {tabindex:'-1'},
                    innerHTML: 'For more info check out <a href="https://taginfo.openstreetmap.org/tags" target="_blank" tabindex="-1">taginfo.openstreetmap.org</a>'
                })

                const queryBtn = createButton({
                    parent: container,
                    innerText: 'Query',
                    className: 'btn-sm btn-primary fs-12',
                    attrs: {type:'button'},
                    events: {
                        click: async (e) => {
                            await toolHandler(e, async (e) => {
                                const types = Array.from(container.querySelectorAll('.form-check-input')).filter(i => i.checked).map(i => i.value)
                                const tags = cleanOverpassTags(container.querySelector('input[name="overpassTag"]').value)
                                menuContainer.remove()

                                const queryGeom = turf.bboxPolygon(getLeafletMapBbox(map)).geometry
                                await dataToChecklist(getOSMDataFetchers({types, tags}), {queryGeom, abortBtns, controller})
                            })
                        }
                    }
                })

                const menuContainer = contextMenuHandler(e, {
                    confirm: {child: container}
                }, {
                    title: 'Overpass API filters', dismissBtn:true
                })
            }
        },
        layerPoint: {
            iconSpecs: 'bi-stack',
            title: 'Query layers at point',
            altShortcut: 'r',
            mapClickHandler: async (e, {abortBtns, controller} = {}) => {
                const fetchers = Object.entries(map._legendLayerGroups.reduce((acc, group) => {
                    group.eachLayer(layer => {
                        if (acc[layer._dbIndexedKey]?.includes(layer._params.title)) return
                        if (!map.hasLayer(layer)) return

                        acc[layer._dbIndexedKey] = [...(acc[layer._dbIndexedKey] ?? []), layer._params.title]
                    })
                    return acc
                }, {})).map(i => { return {key:i[0], title:i[1].join(' / ')} })

          
                if (!fetchers.length) {
                    errorRemark = 'No layers to query.'
                    return
                }
                
                const queryGeom = turf.point(Object.values(e.latlng).reverse())
                await dataToChecklist(fetchers, {queryGeom, abortBtns, controller, event:e})
            }
        },
        divider1: {
            tag: 'div',
            className: 'vr m-2',
        },
        cancel: {
            iconSpecs: 'bi-arrow-counterclockwise',
            title: 'Cancel ongoing query',
            disabled: true,
        },
        divider2: {
            tag: 'div',
            className: 'vr m-2',
        },
        zoomin: {
            iconSpecs: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            toolHandler: false,
            disabled: true,
            btnClickHandler: async () => {
                const bounds = Array.from(layers.querySelectorAll('input.form-check-input')).map(checkbox => {
                    const layer = checkbox._leafletLayer
                    if (layer instanceof L.GeoJSON) {
                        return L.rectangle(layer.getBounds()).toGeoJSON()
                    }
                }).filter(bound => bound)

                if (!bounds.length) return

                await zoomToLeafletLayer(L.geoJSON(turf.featureCollection(bounds)), map)
            },
        },
        visibility: {
            iconSpecs: 'bi bi-eye',
            title: 'Toggle visibility',
            toolHandler: false,
            disabled: true,
            btnClickHandler: () => {
                const checkboxes = Array.from(layers.querySelectorAll('input.form-check-input'))
                const hide = checkboxes.some(el => el.checked)
                checkboxes.forEach(el => {
                    if (el.checked === hide) el.click()
                })
            },
        },
        divider3: {
            tag: 'div',
            className: 'vr m-2',
        },
        collapse: {
            iconSpecs: 'bi bi-chevron-up',
            title: 'Collapse/expand',
            toolHandler: false,
            disabled: true,
            btnClickHandler: () => toggleCollapseElements(layers),
        },
        clear: {
            iconSpecs: 'bi-trash-fill',
            title: 'Clear query results',
            disabled: true,
            btnClickHandler: true
        },
    })
}
