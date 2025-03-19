const handleLeafletLegendPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    
    const toolbar = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-legend-toolbar`
    toolbar.className = 'd-flex px-3 py-2'
    parent.appendChild(toolbar)

    const layers = document.createElement('div')
    layers.id = `${mapContainer.id}-panels-legend-layers`
    layers.className = 'p-3 d-none border-top'
    parent.appendChild(layers)



    // map.on('layeradd', (event) => {
    //     const layer = event.layer
    //     if (layer instanceof L.GeoJSON) {
    //         const container = document.createElement('div')
    //         container.id = `${layers.id}-${layer._leaflet_id}`
    //         container.className = 'd-flex flex-nowrap gap-3 px-3 mb-3'
    //         parent.appendChild(container)
        
    //         // const styles = {}
    //         // layer.eachLayer(subLayer => {
    //         //     const type = subLayer.feature.geometry.type
    //         //     if (type.toLowerCase().endsWith('point')) {
    //         //         const html = subLayer.options.icon.options.html
    //         //         if (styles['Point']) {
    //         //             styles['Point'].count +=1
    //         //         } else {
    //         //             styles['Point'] = {
    //         //                 html,
    //         //                 count: 1,
    //         //             }
    //         //         }
    //         //     }
    //         // })
            
    //         // for (const title in styles) {
    //         //     const icon = document.createElement('div')
    //         //     icon.innerHTML = styles[title].html
    //         //     container.appendChild(icon)

    //         //     const label = document.createElement('div')
    //         //     label.innerText = `${title} (${styles[title].count})`
    //         //     container.appendChild(label)
    //         // }
    //     }
    // })
}

const handleLeafletQueryPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    const queryGroup = map.getLayerGroups().query
    
    const toolbar = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-query-toolbar`
    toolbar.className = 'd-flex px-3 py-2 gap-1'
    parent.appendChild(toolbar)
    
    const results = document.createElement('div')
    results.id = `${mapContainer.id}-panels-query-results`
    results.className = 'p-3 d-none border-top flex-grow-1 overflow-auto'
    parent.appendChild(results)
    
    const status = document.createElement('div')
    status.id = `${mapContainer.id}-panels-query-status`
    status.className = 'p-3 border-top d-flex gap-2 flex-nowrap d-none'
    parent.appendChild(status)
    
    const spinner = document.createElement('div')
    spinner.id = `${mapContainer.id}-panels-query-spinner`
    spinner.className = 'spinner-border spinner-border-sm'
    spinner.setAttribute('role', 'status')
    status.appendChild(spinner)

    const remark = document.createElement('div')
    remark.innerText = 'Running query...'
    status.appendChild(remark)

    const queryStyleParams = {
        color: 'hsla(111, 100%, 54%, 1)',
        strokeWidth: 2,
        // iconStroke: 0,
        // iconGlow: true,
    }

    let controller
    const resetController = () => {
        if (controller) controller.abort('New query started.')
        controller = new AbortController()
        controller.id = generateRandomString()
        return controller
    }
    resetController()

    const getCancelBtn = () => toolbar.querySelector(`#${toolbar.id}-cancel`)
 
    const clearResults = () => {
        for (const tool in queryTools) {
            const data = queryTools[tool]
            if (data.disabled) {
                toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled = true
            }
        }
        
        results.classList.add('d-none')
        results.innerHTML = ''
        queryGroup.clearLayers()        
    }

    const queryHandler = async (e, handler) => {
        clearResults()
        
        if (typeof handler !== 'function') return

        const controllerId = resetController().id

        status.classList.remove('d-none')
        
        const cancelBtn = toolbar.querySelector(`#${toolbar.id}-cancel`)
        cancelBtn.disabled = false
        const geojsons = await handler(e)
        cancelBtn.disabled = true
        
        if (controllerId !== controller.id) return
        
        if (geojsons && Object.values(geojsons).some(g => g?.features?.length)) {
            const defaultFeature = e.latlng ? turf.point(
                Object.values(e.latlng).reverse()
            ) : L.rectangle(map.getBounds()).toGeoJSON()
            const defaultGeom = defaultFeature.geometry

            const content = await createGeoJSONChecklist(geojsons, queryGroup, {
                defaultGeom,
                controller, 
                pane: 'queryPane', 
                styleParams: queryStyleParams, 
            })
            results.appendChild(content)
        }
        
        if (results.innerHTML !== '' || queryGroup.getLayers().length > 0) {
            results.classList.remove('d-none')
            toolbar.querySelector(`#${toolbar.id}-clear`).disabled = false
            
            if (results.querySelectorAll('.collapse').length) {
                toolbar.querySelector(`#${toolbar.id}-collapse`).disabled = false
            }
        }
        
        status.classList.add('d-none')
    }
    
    const queryTools = {
        locationCoords: {
            iconClass: 'bi-geo-alt-fill',
            title: 'Query point coordinates',
            altShortcut: 'q',
            mapClickHandler: async (e) => {
                const feature = turf.point(Object.values(e.latlng).reverse())
                
                const layer = getLeafletGeoJSONLayer({
                    pane: 'queryPane',
                    geojson: feature, 
                    styleParams: queryStyleParams,
                })
                queryGroup.addLayer(layer)

                const content = createPointCoordinatesTable(feature, {precision:6})
                results.appendChild(content)
            },
        },
        osmPoint: {
            iconClass: 'bi-pin-map-fill',
            title: 'Query OSM at point',
            altShortcut: 'w',
            mapClickHandler: async (e) => await fetchGeoJSONs({
                'OpenStreetMap via Nominatim': {
                    handler: fetchNominatim,
                    params: [e.latlng, map],
                },
                'OpenStreetMap via Overpass': {
                    handler: fetchOverpassAroundPt,
                    params: [e.latlng, map],
                },
            }, {abortBtns: [getCancelBtn()], controller})
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            btnClickHandler: async (e) => {
                console.log('osm in bbox')
            }
        },
        layerPoint: {
            iconClass: 'bi-stack',
            title: 'Query layers at point',
        },
        divider1: {
            tag: 'div',
            className: 'vr m-2',
        },
        cancel: {
            iconClass: 'bi-arrow-counterclockwise',
            title: 'Cancel ongoing query',
            disabled: true,
        },
        clear: {
            iconClass: 'bi-trash-fill',
            title: 'Clear query results',
            disabled: true,
            btnClickHandler: true
        },
        divider2: {
            tag: 'div',
            className: 'vr m-2',
        },
        collapse: {
            iconClass: 'bi bi-chevron-up',
            title: 'Collapse results',
            queryHandler: false,
            disabled: true,
            btnClickHandler: () => {
                const shownCollapseElements = results.querySelectorAll('.collapse.show')
                shownCollapseElements.forEach(element => {
                    const instance = bootstrap.Collapse.getOrCreateInstance(element)
                    instance.hide()
                })
            },
        },
    }

    Object.keys(queryTools).forEach(newMode => {
        const data = queryTools[newMode]
        if (data.altShortcut && data.title) data.title = `${data.title} (alt+${data.altShortcut})` 

        const tag = data.tag || 'button'
        
        const element = tag !== 'button' ?
        customCreateElement(tag, data) :
        createButton({...data, ...{
            id: `${toolbar.id}-${newMode}`,
            className:`btn-sm btn-${getPreferredTheme()}`,
            clichHandler: async (event) => {
                L.DomEvent.stopPropagation(event);
                L.DomEvent.preventDefault(event);        
                
                const btn = event.target
                const currentMode = map._queryMode
                const activate = currentMode !== newMode
                const mapClickHandler = activate ? data.mapClickHandler : null 
                const btnClickHandler = activate ? data.btnClickHandler : null 
                
                if (data.queryHandler === false) return btnClickHandler()

                if (activate && currentMode) {
                    toolbar.querySelector(`#${toolbar.id}-${currentMode}`).click()
                }
                
                btn.classList.toggle('btn-primary', mapClickHandler)
                btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                map._queryMode = mapClickHandler ? newMode : undefined
                
                if (mapClickHandler) {
                    const clickQueryHandler = async (e) => {
                        if (!isLeafletControlElement(e.originalEvent.target) && map._queryMode === newMode) {
                            map.off('click', clickQueryHandler)
                            enableLeafletLayerClick(map)
                            
                            await queryHandler(e, mapClickHandler)
                            if (btn.classList.contains('btn-primary')) btn.click()
                        }
                    } 
                    
                    disableLeafletLayerClick(map)
                    map.on('click', clickQueryHandler)
                } else {
                    enableLeafletLayerClick(map)
                    map._events.click = map._events.click?.filter(handler => {
                        return handler.fn.name !== 'clickQueryHandler'
                    })
                }
                
                if (btnClickHandler) await queryHandler(event, btnClickHandler)
            }
        }})

        if (data.altShortcut) document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === data.altShortcut) {
                L.DomEvent.preventDefault(e)
                element.click()
            }
        })        
        
        toolbar.appendChild(element)
    })
}

const handleLeafletMapPanels = (map) => {
    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column')
        
        const [toggle, body] = createMapPanels(map.getContainer())
        panel.appendChild(toggle)
        panel.appendChild(body)
        handleLeafletQueryPanel(map, body.querySelector(`#${body.id}-accordion-query .accordion-body`))
        handleLeafletLegendPanel(map, body.querySelector(`#${body.id}-accordion-legend .accordion-body`))
        
        return panel
    }
    
    control.addTo(map)
}