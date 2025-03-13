const handleLeafletQueryPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    const queryGroup = map.getLayerGroups().query
    
    const toolbar = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-query-toolbar`
    toolbar.className = 'd-flex px-3 py-2'
    parent.appendChild(toolbar)
    
    const results = document.createElement('div')
    results.id = `${mapContainer.id}-panels-query-results`
    results.className = 'p-3 d-none border-top'
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
        iconStroke: 0,
        iconGlow: true,
    }

    let controller
    const resetController = () => {
        controller = new AbortController()
        controller.signal.onabort = () => {
            console.log(event)
        }
    }
    resetController()

    const getCancelBtn = () => toolbar.querySelector(`#${toolbar.id}-cancel`)
 
    const clearResults = () => {
        toolbar.querySelectorAll(`#${toolbar.id}-clear, #${toolbar.id}-cancel`)
        .forEach(btn => btn.disabled = true)
        
        results.classList.add('d-none')
        results.innerHTML = ''
        queryGroup.clearLayers()        
    }

    const queryHandler = async (e, handler) => {
        console.log(typeof e.target, e.target)

        clearResults()
        
        if (typeof handler !== 'function') return

        status.classList.remove('d-none')
        
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

        status.classList.add('d-none')

        if (controller.signal.aborted) resetController()
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
            btnClickHandler: clearResults
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
                    const mapClickHandler = activate ? data.mapClickHandler : null 
                    const btnClickHandler = activate ? data.btnClickHandler : null 
                    
                    if (activate && currentMode) {
                        toolbar.querySelector(`#${toolbar.id}-${currentMode}`).click()
                    }
                    
                    btn.classList.toggle('btn-primary', mapClickHandler)
                    btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                    mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                    map._queryMode = activate ? newMode : undefined
                    
                    if (mapClickHandler) {
                        const clickQueryHandler = async (e) => {
                            const mapClick = e.originalEvent.target === mapContainer
                            if (mapClick) await queryHandler(e, mapClickHandler)
                        } 
                        map.on('click', clickQueryHandler)
                    } else {
                        map._events.click = map._events.click?.filter(handler => {
                            return handler.fn.name !== 'clickQueryHandler'
                        })

                    }
                    
                    if (btnClickHandler) await queryHandler(event, btnClickHandler)
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
