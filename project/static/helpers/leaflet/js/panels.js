const handleLeafletQueryPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    const queryGroup = map.getLayerGroups().query
    
    const toolbar = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-query-toolbar`
    toolbar.className = 'd-flex px-3 py-2'
    parent.appendChild(toolbar)
    
    const results = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-query-results`
    results.className = 'p-3 d-none border-top'
    parent.appendChild(results)

    const queryStyleParams = {
        color: 'hsla(111, 100%, 54%, 1)',
        iconStroke: 0,
        iconGlow: true,
    }

    let controller = new AbortController()
    const resetController = () => {
        controller.abort()
        controller = new AbortController()
    }

    const getAbortBtns = () => toolbar.querySelectorAll('button')

    const resetResults = () => {
        toolbar.querySelectorAll(`#${toolbar.id}-clear, #${toolbar.id}-cancel`)
        .forEach(btn => btn.disabled = true)
        
        results.classList.add('d-none')
        results.innerHTML = ''
        queryGroup.clearLayers()
    }
    
    const queryHandler = async (e, handler) => {
        resetResults()
        resetController()

        if (!handler) return

        const cancelBtn = toolbar.querySelector(`#${toolbar.id}-cancel`)
        cancelBtn.disabled = false
        const geojsons = await handler(e)
        cancelBtn.disabled = true

        if (geojsons && Object.values(geojsons).some(g => g?.features?.length)) {
            const content = createGeoJSONChecklist(geojsons)
            results.appendChild(content)
        }
        
        if (results.innerHTML !== '' || queryGroup.getLayers().length > 0) {
            results.classList.remove('d-none')
            toolbar.querySelector(`#${toolbar.id}-clear`).disabled = false
        }
    }

    const queryTools = {
        locationCoords: {
            iconClass: 'bi-geo-alt-fill',
            title: 'Query point coordinates',
            mapClickHandler: async (e) => {
                const feature = turf.point(Object.values(e.latlng).reverse())
                
                const layer = getLeafletGeoJSONLayer({
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
            mapClickHandler: async (e) => await fetchGeoJSONs({
                'OpenStreetMap via Nominatim': {
                    handler: fetchNominatim,
                    params: [e.latlng, map.getZoom()],
                },
                'OpenStreetMap via Overpass': {
                    handler: fetchOverpassAroundPt,
                    params: [
                        e.latlng,
                        (getLeafletMeterScale(map) || leafletZoomToMeter(map.getZoom()))/2
                    ],
                },
            }, {abortBtns: getAbortBtns(), controller})
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            btnclickHandler: async (e) => {
                console.log('osm in bbox')
                e.target.click()
            }
        },
        layerPoint: {
            iconClass: 'bi-stack',
            title: 'Query layers at point',
        },
        divider: {
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
        },
    }

    Object.keys(queryTools).forEach(newMode => {
        const data = queryTools[newMode]
        const tag = data.tag || 'button'
        toolbar.appendChild(
            tag !== 'button' ?
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
                    
                    if (activate) {
                        toolbar.querySelector(`#${toolbar.id}-${currentMode}`)?.click()
                        
                        if (data.mapClickHandler) {
                            btn.classList.remove(`btn-${getPreferredTheme()}`)
                            btn.classList.add(`btn-primary`)
                            mapContainer.style.cursor = 'pointer'
                            
                            const clickQueryHandler = async (e) => {
                                if (e.originalEvent.target === mapContainer) {
                                    await queryHandler(e, data.mapClickHandler)
                                }
                            } 
                            map.on('click', clickQueryHandler)
                        }
                        
                        map._queryMode = newMode
                        await queryHandler(event, data.btnclickHandler)
                    } else {
                        btn.classList.add(`btn-primary`)
                        btn.classList.remove(`btn-${getPreferredTheme()}`)
                        mapContainer.style.cursor = ''
                        
                        map._events.click = map._events.click?.filter(handler => {
                            return handler.fn.name !== 'clickQueryHandler'
                        })

                        map._queryMode = undefined
                    }
                }
            }})
        )
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
        
        return panel
    }
    
    control.addTo(map)
}
