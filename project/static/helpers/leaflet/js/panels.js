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
    status.className = 'p-3 border-top d-flex gap-2 flex-nowrap'
    parent.appendChild(status)
    
    const spinner = document.createElement('div')
    spinner.id = `${mapContainer.id}-panels-query-spinner`
    spinner.className = 'spinner-border spinner-border-sm'
    spinner.setAttribute('role', 'status')
    status.appendChild(spinner)

    const remark = document.createElement('div')
    remark.innerText = 'Running query...'
    status.appendChild(remark)

    // <div class="spinner-border spinner-border-sm" role="status">
    //     <span class="visually-hidden">Loading...</span>
    // </div>

    const queryStyleParams = {
        color: 'hsla(111, 100%, 54%, 1)',
        iconStroke: 0,
        iconGlow: true,
    }

    let controller = new AbortController()
    const resetController = () => {
        controller.abort('Query reset.')
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
                    const mapClickHandler = activate ? data.mapClickHandler : null 
                    
                    if (activate && currentMode) {
                        toolbar.querySelector(`#${toolbar.id}-${currentMode}`).click()
                    }
                    
                    btn.classList.toggle('btn-primary', mapClickHandler)
                    btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                    mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                    map._queryMode = activate ? newMode : undefined
                    
                    if (mapClickHandler) {
                        const clickQueryHandler = async (e) => {
                            if (e.originalEvent.target === mapContainer) {
                                await queryHandler(e, mapClickHandler)
                            }
                        } 
                        map.on('click', clickQueryHandler)
                    } else {
                        map._events.click = map._events.click?.filter(handler => {
                            return handler.fn.name !== 'clickQueryHandler'
                        })

                        if (activate) await queryHandler(event, data.btnclickHandler)
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
