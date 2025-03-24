const createLeafletMapPanelTemplate = (map, parent, name, {
    statusBar = false,
    spinnerRemark = '',
    errorRemark = '',
    clearLayersHandler,
    toolHandler,
} = {}) => {
    const template = {}

    const mapContainer = map.getContainer()
    const baseId = `${mapContainer.id}-panels-${name}`

    const toolbar = document.createElement('div')
    toolbar.id = `${baseId}-toolbar`
    toolbar.className = 'd-flex px-3 py-2 flex-wrap'
    parent.appendChild(toolbar)
    template.toolbar = toolbar
    
    const layers = document.createElement('div')
    layers.id = `${baseId}-layers`
    layers.className = `flex-grow-1 overflow-auto p-3 d-none border-top rounded-bottom text-bg-${getPreferredTheme()}`
    parent.appendChild(layers)
    template.layers = layers
    
    if (statusBar) {
        const status = document.createElement('div')
        status.id = `${baseId}-status`
        status.className = 'd-flex gap-2 flex-nowrap'
        parent.appendChild(status)
        template.status = status
        
        const spinner = document.createElement('div')
        status.id = `${status.id}-spinner`
        spinner.className = 'p-3 border-top d-none'
        status.appendChild(spinner)
        template.spinner = spinner

        const spinnerIcon = document.createElement('div')
        spinnerIcon.className = 'spinner-border spinner-border-sm'
        spinnerIcon.setAttribute('role', 'status')
        spinner.appendChild(spinnerIcon)
        
        const spinnerRemarkDiv = document.createElement('div')
        spinnerRemarkDiv.innerText = spinnerRemark
        spinner.appendChild(spinnerRemarkDiv)
    
        const error = document.createElement('div')
        error.id = `${status.id}-error`
        error.className = 'p-3 border-top d-none'
        status.appendChild(error)
        template.error = error

        const errorIcon = document.createElement('div')
        errorIcon.className = 'bi bi-bug'
        error.appendChild(errorIcon)
        
        const errorRemarkDiv = document.createElement('div')
        errorRemarkDiv.innerText = errorRemark
        spinner.appendChild(spinnerRemarkDiv)    
    }

    template.clearLayers = (tools) => {
        layers.innerHTML = ''
        layers.classList.add('d-none')

        if (clearLayersHandler) clearLayersHandler()
            
        for (const tool in tools) {
            const data = tools[tool]
            if (data.disabled) {
                toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled = true
            }
        }    

        if (statusBar) {
            parent.querySelector(`#${baseId}-status-spinner`).classList.add('d-none')
            parent.querySelector(`#${baseId}-status-error`).classList.add('d-none')
        }
    }

    template.toolsHandler = (tools) => {
        Object.keys(tools).forEach(toolId => {
            const data = tools[toolId]
            if (data.altShortcut && data.title) data.title = `${data.title} (alt+${data.altShortcut})` 
    
            const tag = data.tag || 'button'
            const element = tag !== 'button' ?
            customCreateElement(tag, data) :
            createButton({...data,
                id: `${toolbar.id}-${toolId}`,
                className:`btn-sm btn-${getPreferredTheme()}`,
                clickHandler: async (event) => {
                    L.DomEvent.stopPropagation(event);
                    L.DomEvent.preventDefault(event);        
                    
                    const btn = event.target
                    const currentMode = map._panelMode
                    const activate = currentMode !== toolId
                    const mapClickHandler = activate ? data.mapClickHandler : null 
                    const btnClickHandler = activate ? data.btnClickHandler : null     
                    const skipToolHandler = !toolHandler || data.toolHandler === false

                    if (activate && currentMode) {
                        toolbar.querySelector(`#${toolbar.id}-${currentMode}`).click()
                    }
                    
                    btn.classList.toggle('btn-primary', mapClickHandler)
                    btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                    mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                    map._panelMode = mapClickHandler ? toolId : undefined
    
                    if (mapClickHandler) {
                        const panelMapClickHandler = async (e) => {
                            if (isLeafletControlElement(e.originalEvent.target) || map._panelMode !== toolId) return
    
                            map.off('click', panelMapClickHandler)
                            enableLeafletLayerClick(map)
                            
                            skipToolHandler ? await mapClickHandler() : await toolHandler(e, mapClickHandler)
                            if (btn.classList.contains('btn-primary')) btn.click()
                        }
                        
                        disableLeafletLayerClick(map)
                        map.on('click', panelMapClickHandler)
                    } else {
                        enableLeafletLayerClick(map)
                        map._events.click = map._events.click?.filter(handler => {
                            return handler.fn.name !== 'panelMapClickHandler'
                        })
                    }
                    
                    if (btnClickHandler) skipToolHandler ? await btnClickHandler() : await toolHandler(event, btnClickHandler)
                }
            })
    
            if (data.altShortcut) document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === data.altShortcut) {
                    L.DomEvent.preventDefault(e)
                    element.click()
                }
            })        
            
            toolbar.appendChild(element)
        })
    
        return tools
    }

    return template
}

const handleLeafletLegendPanel = (map, parent) => {
    const {
        toolbar, 
        layers,
        clearLayers,
        toolsHandler,
    } = createLeafletMapPanelTemplate(map, parent, 'legend', {
        clearLayersHandler: () => map.clearLegendLayers()
    })

    const tools = toolsHandler({
        zoomin: {
            iconClass: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            disabled: true,
            btnClickHandler: () => map.zoomToLegendLayers(),
        },
        visibility: {
            iconClass: 'bi bi-eye',
            title: 'Toggle visibility',
            disabled: true,
            btnClickHandler: () => {
                map.hasHiddenLegendLayers() ? 
                map.showLegendLayers() : 
                map.hideLegendLayers()
            },
        },
        divider1: {
            tag: 'div',
            className: 'vr m-2',
        },
        collapse: {
            iconClass: 'bi bi-chevron-up',
            title: 'Collapse/expand',
            disabled: true,
            btnClickHandler: () => toggleCollapseElements(layers),
        },
        toggleLegends: {
            iconClass: 'bi bi-list-task',
            title: 'Toggle legends',
            disabled: true,
            btnClickHandler: () => layers.classList.toggle('d-none'),
        },
        toggleAttribution: {
            iconClass: 'bi bi-c-circle',
            title: 'Toggle attributions',
            disabled: true,
            btnClickHandler: () => {
                const attrElements = Array.from(layers.children).map(container => {
                    return container.querySelector(`#${container.id}-attribution`)
                })
                const show = attrElements.some(el => el.classList.contains('d-none'))
                attrElements.forEach(el =>  el.classList.toggle('d-none', !show))
            },
        },
        clear: {
            iconClass: 'bi-trash-fill',
            title: 'Clear legend layers',
            disabled: true,
            btnClickHandler: () => clearLayers(tools)
        },
        // divider2: {
        //     tag: 'div',
        //     className: 'vr m-2',
        // },
    })

    map.on('layerremove', (e) => {
        const layer = e.layer
        const layerLegend = layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
        if (!layerLegend) return

        if (map.hasLegendLayer(layer)) {
            layerLegend.querySelector(`#${layerLegend.id}-collapse`).classList.add('d-none')
        } else {
            layerLegend.remove()
            if (layers.innerHTML === '') clearLayers(tools)
        }
    })

    map.on('layeradd', (e) => {
        const layer = e.layer
        
        if (!map.hasLegendLayer(layer)) return
        
        let container = layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)
        if (!container) {
            const paneName = layer.options.pane
            const pane = map.getPane(paneName)
            pane.style.zIndex = layers.children.length + 200

            container = document.createElement('div')
            container.id = `${layers.id}-${layer._leaflet_id}`
            container.setAttribute('data-layer-pane', paneName)
            container.setAttribute('data-layer-id', layer._leaflet_id)
            container.className = 'd-flex flex-nowrap flex-column gap-1 mb-2'
            layers.insertBefore(container, layers.firstChild)
            
            const legendTitle = document.createElement('div')
            legendTitle.id = `${container.id}-title`
            legendTitle.className = 'd-flex flex-nowrap'
            legendTitle.appendChild(createSpan(layer._title))
            container.appendChild(legendTitle)
            
            const toggleContainer = document.createElement('div')
            toggleContainer.className = 'ms-auto d-flex flex-nowrap gap-2'
            legendTitle.appendChild(toggleContainer)
            
            const legendCollapse = document.createElement('div')
            legendCollapse.id = `${container.id}-collapse`
            legendCollapse.className = 'collapse show'
            container.appendChild(legendCollapse)

            const legendDetails = document.createElement('div')
            legendDetails.id = `${container.id}-details`
            legendDetails.className = 'd-flex'
            legendCollapse.appendChild(legendDetails)
            
            const legendAttribution = document.createElement('div')
            legendAttribution.id = `${container.id}-attribution`
            legendAttribution.className = 'd-flex'
            legendAttribution.innerHTML = layer._attribution
            legendCollapse.appendChild(legendAttribution)
    
            const collapseToggle = createIcon({
                parent: toggleContainer,
                peNone: false,
                className: 'dropdown-toggle'
            })
            collapseToggle.style.cursor = 'pointer'
            collapseToggle.setAttribute('data-bs-toggle', 'collapse')
            collapseToggle.setAttribute('data-bs-target', `#${legendCollapse.id}`)
            collapseToggle.setAttribute('aria-controls', legendCollapse.id)
            collapseToggle.setAttribute('aria-expanded', 'true')
    
            const menuToggle = createIcon({
                parent: toggleContainer,
                peNone: false,
                className: 'bi bi-three-dots'
            })
            menuToggle.style.cursor = 'pointer'
            // menuToggle.addEventListener('click', checklistContextMenuHandler)
            
            if (layer instanceof L.GeoJSON) createGeoJSONLayerLegend(
                layer, 
                legendDetails
            )
        } else {
            container.querySelector(`#${container.id}-collapse`).classList.remove('d-none')
        }

        // const legendDetails = container.querySelector(`#${container.id}-details`)

        if (layers.innerHTML !== '') {
            layers.classList.remove('d-none')
            for (const tool in tools) {
                const data = tools[tool]
                if (data.disabled) {
                    toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled = false
                }
            }        
        }
    })
}

const handleLeafletQueryPanel = (map, parent) => {
    const queryGroup = map.getLayerGroups().query
    const {
        toolbar, 
        layers,
        status,
        spinner,
        error,
        clearLayers,
        toolsHandler,
    } = createLeafletMapPanelTemplate(map, parent, 'query', {
        statusBar: true,
        spinnerRemark: 'Running query...',
        errorRemark: 'Query was unsuccessful. Please try again.',
        clearLayersHandler: () => queryGroup.clearLayers(),
        toolHandler: async (e, handler) => {
            clearLayers(tools)
            
            if (typeof handler !== 'function') return
    
            const controllerId = resetController().id
    
            spinner.classList.remove('d-none')
            
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
                    customStyleParams: queryStyleParams, 
                })
                if (content) {
                    layers.appendChild(content)
                } else {
                    error.classList.remove('d-none')
                }
            }
            
            if (layers.innerHTML !== '' || queryGroup.getLayers().length > 0) {
                layers.classList.remove('d-none')
            
                Array(
                    'clear',
                    'collapse',
                    'visibility',
                    'zoomin',
                ).forEach(toolName => toolbar.querySelector(`#${toolbar.id}-${toolName}`).disabled = false)
            }
                
            spinner.classList.add('d-none')
        }
    })

    const queryStyleParams = {
        color: 'hsla(111, 100%, 54%, 1)',
        strokeWidth: 1,
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

    const tools = toolsHandler({
        locationCoords: {
            iconClass: 'bi-geo-alt-fill',
            title: 'Query point coordinates',
            altShortcut: 'q',
            mapClickHandler: async (e) => {
                const feature = turf.point(Object.values(e.latlng).reverse())
                
                const layer = getLeafletGeoJSONLayer({
                    pane: 'queryPane',
                    geojson: feature, 
                    customStyleParams: queryStyleParams,
                })
                queryGroup.addLayer(layer)
    
                const content = createPointCoordinatesTable(feature, {precision:6})
                layers.appendChild(content)
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
                    handler: fetchOverpass,
                    params: [map],
                    options: {latlng:e.latlng},
                },
            }, {abortBtns: [getCancelBtn()], controller})
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            altShortcut: 'e',
            btnClickHandler: async (e) => await fetchGeoJSONs({
                'OpenStreetMap via Overpass': {
                    handler: fetchOverpass,
                    params: [map],
                },
            }, {abortBtns: [getCancelBtn()], controller})
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
        divider2: {
            tag: 'div',
            className: 'vr m-2',
        },
        zoomin: {
            iconClass: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            toolHandler: false,
            disabled: true,
            btnClickHandler: () => {
                const checkboxes = Array.from(layers.querySelectorAll('input.form-check-input[data-geojson-type="layer"]'))
                const bounds = checkboxes.map(checkbox => {
                    return L.rectangle(checkbox._leafletLayer.getBounds()).toGeoJSON()
                }).filter(bound => bound)
                map.fitBounds(L.geoJSON(turf.featureCollection(bounds)).getBounds())
            },
        },
        visibility: {
            iconClass: 'bi bi-eye',
            title: 'Toggle visibility',
            toolHandler: false,
            disabled: true,
            btnClickHandler: () => {
                const checkboxes = Array.from(layers.querySelectorAll('input.form-check-input[data-geojson-type="layer"]'))
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
            iconClass: 'bi bi-chevron-up',
            title: 'Collapse/expand',
            toolHandler: false,
            disabled: true,
            btnClickHandler: () => toggleCollapseElements(layers),
        },
        clear: {
            iconClass: 'bi-trash-fill',
            title: 'Clear query results',
            disabled: true,
            btnClickHandler: true
        },
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