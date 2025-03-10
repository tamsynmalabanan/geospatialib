const handleLeafletQueryPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    const queryGroup = map.getLayerGroups().query
    
    const toolbarId = `${mapContainer.id}-panels-query-toolbar`
    const toolbar = document.createElement('div')
    toolbar.id = toolbarId
    toolbar.className = 'd-flex px-3 py-2'
    parent.appendChild(toolbar)

    const results = document.createElement('div')
    results.className = 'p-3 d-none border-top'
    parent.appendChild(results)

    const resetResults = () => {
        Array('clear', 'cancel').forEach(tool => {
            toolbar.querySelector(`#${toolbarId}-${tool}`).disabled = true
        })

        results.classList.add('d-none')
        results.innerHTML = ''
        queryGroup.clearLayers()
    }

    const queryStyleParams = {
        color: 'hsla(111, 100%, 54%, 1)',
        iconStroke: 0,
        iconGlow: true,
    }

    const fetchGeoJSONs = async (fetchers) => {
        const fetchedGeoJSONs = await Promise.all(Object.values(fetchers).map(fetcher => fetcher.handler(
            ...fetcher.params, {
                abortBtn: toolbar.querySelector(`#${toolbarId}-cancel`)
            }
        )))

        const geojsons = {}
        for (let i = 0; i < fetchedGeoJSONs.length; i++) {
            geojsons[Object.keys(fetchers)[i]] = fetchedGeoJSONs[i]
        }

        return geojsons
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
                }
            })
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            btnclickHandler: async (e) => {
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

    const handleBtns = (ongoingQuery) => {
        Object.keys(queryTools).forEach(tool => {
            const btn = tool !== 'clear' ? toolbar.querySelector(`#${toolbarId}-${tool}`) : null
            if (btn) btn.disabled = tool === 'cancel' ? ongoingQuery ? false : true : ongoingQuery ? true : false
        })
    }

    const queryHandler = async (e, handler) => {
        resetResults()

        handleBtns(ongoingQuery=true)
        const geojsons = await handler(e)
        handleBtns(ongoingQuery=false)
        
        if (geojsons && Object.values(geojsons).some(g => g?.features?.length)) {
            const content = createGeoJSONChecklist(geojsons)
            results.appendChild(content)
        }
        
        if (results.innerHTML !== '' || queryGroup.getLayers().length > 0) {
            results.classList.remove('d-none')
            toolbar.querySelector(`#${toolbarId}-clear`).disabled = false
        }
    }

    Object.keys(queryTools).forEach(tool => {
        const data = queryTools[tool]
        const tag = data.tag || 'button'
        toolbar.appendChild(
            tag !== 'button' ?
            customCreateElement(tag, data) :
            createButton({...data, ...{
                id: `${toolbarId}-${tool}`,
                className:`btn-sm btn-${getPreferredTheme()}`,
                clichHandler: async (event) => {
                    L.DomEvent.stopPropagation(event);
                    L.DomEvent.preventDefault(event);        
                    
                    const queryMode = map._queryMode
                    const activate = queryMode !== tool
                    if (activate && queryMode) {
                        toolbar.querySelector(`#${toolbarId}-${queryMode}`).click()
                    }
                    
                    const btn = event.target
                    if (Array('clear', 'cancel').includes(tool)) {
                        return resetResults()
                    } else {
                        console.log('here')
                        Array(`btn-${getPreferredTheme()}`, 'btn-primary')
                        .forEach(className => btn.classList.toggle(className))
                    }

                    mapContainer.style.cursor = activate ? 'pointer' : ''
                    map._queryMode = activate ? tool : undefined
                    
                    if (activate && data.mapClickHandler) {
                        const clickQueryHandler = async (e) => {
                            if (e.originalEvent.target === mapContainer) {
                                await queryHandler(e, data.mapClickHandler)
                            }
                        } 
                        map.on('click', clickQueryHandler)
                    } else {
                        map._events.click = map._events.click?.filter(handler => {
                            return handler.fn.name !== 'clickQueryHandler'
                        })
                    }
                 
                    if (activate && data.btnclickHandler) {
                        await queryHandler(event, data.btnclickHandler)
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
