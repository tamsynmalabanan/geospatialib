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
        status.className = 'd-flex flex-column'
        parent.appendChild(status)
        template.status = status
        
        const spinner = document.createElement('div')
        spinner.id = `${status.id}-spinner`
        spinner.className = 'p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center'
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
        error.className = 'p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center'
        status.appendChild(error)
        template.error = error

        const errorIcon = document.createElement('div')
        errorIcon.className = 'bi bi-exclamation-triangle-fill'
        error.appendChild(errorIcon)
        
        const errorRemarkDiv = document.createElement('div')
        errorRemarkDiv.innerText = errorRemark
        error.appendChild(errorRemarkDiv)    
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
                    const [panelName, currentMode] = map._panelMode || []
                    const activate = currentMode !== toolId
                    const mapClickHandler = activate ? data.mapClickHandler : null 
                    const btnClickHandler = activate ? data.btnClickHandler : null     
                    const skipToolHandler = !toolHandler || data.toolHandler === false

                    if (activate && currentMode) {
                        document.querySelector(`#${mapContainer.id}-panels-${panelName}-toolbar-${currentMode}`).click()
                    }
                    
                    btn.classList.toggle('btn-primary', mapClickHandler)
                    btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                    mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                    map._panelMode = [name, mapClickHandler ? toolId : undefined]
    
                    if (mapClickHandler) {
                        const panelMapClickHandler = async (e) => {
                            if (isLeafletControlElement(e.originalEvent.target) || map._panelMode[1] !== toolId) return
    
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
                    
                    if (btnClickHandler) {
                        skipToolHandler ? await btnClickHandler(event) : await toolHandler(event, btnClickHandler)
                    }
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
        clearLayersHandler: () => map._ch.clearLegendLayers()
    })

    let controller
    const resetController = () => {
        if (controller) controller.abort('Map moved or zoomed.')
        controller = new AbortController()
        controller.id = generateRandomString()
        return controller
    }
    resetController()

    const tools = toolsHandler({
        zoomin: {
            iconClass: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            disabled: true,
            btnClickHandler: async () => await map._ch.zoomToLegendLayers(),
        },
        visibility: {
            iconClass: 'bi bi-eye',
            title: 'Toggle visibility',
            disabled: true,
            btnClickHandler: () => {
                map._ch.hasHiddenLegendLayers() ? 
                map._ch.showLegendLayers() : 
                map._ch.hideLegendLayers()
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
            btnClickHandler: () => {
                const elements = Array.from(layers.children)
                const show = elements.some(el => el.classList.contains('d-none'))
                elements.forEach(el =>  el.classList.toggle('d-none', !show))
                layers.classList.toggle('d-none', !show)
            },
        },
        toggleAttribution: {
            iconClass: 'bi bi-c-circle',
            title: 'Toggle attributions',
            disabled: true,
            btnClickHandler: () => {
                const elements = Array.from(layers.children).map(container => {
                    return container.querySelector(`#${container.id}-attribution`)
                })
                const show = elements.some(el => el.classList.contains('d-none'))
                elements.forEach(el =>  el.classList.toggle('d-none', !show))
            },
        },
        clear: {
            iconClass: 'bi-trash-fill',
            title: 'Clear legend layers',
            disabled: true,
            btnClickHandler: (e) => {
                const menuContainer = contextMenuHandler(e, {
                    confirm: {
                        innerText: `Confirm to clear legend`,
                        btnCallback: async () => {
                            clearLayers(tools)
                        }
                    },            
                })
                menuContainer.classList.add('bg-danger')
            }
        },
        // divider2: {
        //     tag: 'div',
        //     className: 'vr m-2',
        // },
    })

    map.on('movestart zoomstart', resetController)
    
    let timeout
    map.on('moveend zoomend', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            Array.from(layers.children).reverse().forEach(async legend => {
                const leafletId = parseInt(legend.dataset.layerId)
                const layer = map._ch.getLegendLayer(leafletId)
                if (map._ch.hasHiddenLegendLayer(layer) || !layerIsVisible(layer)) return
                
                if (layer instanceof L.GeoJSON) {
                    await updateGeoJSONData(layer, {controller})

                    if (layer._openpopup) {
                        layer._openpopup.openOn(map)
                        delete layer._openpopup
                    }
                }

            })
        }, 100)
    })

    map.on('layerremove', (event) => {
        const layer = event.layer
        console.log(layer)
        const layerLegend = layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
        if (!layerLegend) return
        
        const isHidden = map._ch.hasHiddenLegendLayer(layer)
        const isInvisible = map._ch.hasInvisibleLegendLayer(layer)
        if (isHidden || isInvisible) {
            const legendDetails = layerLegend.querySelector(`#${layerLegend.id}-details`)
            legendDetails.innerHTML = ''

            if (isHidden) {
                createIcon({
                    className: 'bi bi-eye-slash',
                    parent: legendDetails,
                    peNone: false,
                    title: 'Hidden',
                })
            }
            
            if (isInvisible) {
                createIcon({
                    className: 'bi bi-arrows-expand',
                    parent: legendDetails,
                    peNone: false,
                    title: 'Beyond range of visibility',
                })
            }
        } else {
            layerLegend.remove()
            if (layers.innerHTML === '') clearLayers(tools)
        }

        if (layer instanceof L.GeoJSON) layer.clearLayers()
    })

    map.on('layeradd', (event) => {
        const layer = event.layer
        
        if (!map._ch.hasLegendLayer(layer)) return
        
        let container = layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)
        if (!container) {
            const paneName = layer.options.pane
            const pane = map.getPane(paneName)
            pane.style.zIndex = layers.children.length + 200

            container = document.createElement('div')
            container.id = `${layers.id}-${layer._leaflet_id}`
            container.setAttribute('data-layer-legend', "true")
            container.setAttribute('data-layer-pane', paneName)
            container.setAttribute('data-layer-id', layer._leaflet_id)
            container.className = 'd-flex flex-nowrap flex-column gap-1 mb-2 position-relative'
            layers.insertBefore(container, layers.firstChild)
            
            const legendTitle = document.createElement('div')
            legendTitle.id = `${container.id}-title`
            legendTitle.className = 'd-flex flex-nowrap gap-2'
            legendTitle.appendChild(createSpan(layer._title))
            container.appendChild(legendTitle)
            
            const moveToggle = createIcon({
                peNone: false,
                className: 'bi bi-grip-vertical'
            })
            legendTitle.insertBefore(moveToggle, legendTitle.firstChild)
            Array('mousedown', 'touchstart').forEach(t1 => {
                moveToggle.addEventListener(t1, (e1) => {
                    const startY = e1.type === 'touchstart' ? e1.touches[0].clientY : e1.clientY
                    container.classList.add('highlight', 'z-3')
                    document.body.classList.add('user-select-none')

                    const mouseMoveHandler = (e2) => {
                        const newY = e2.type === 'touchmove' ? e2.touches[0].clientY : e2.clientY
                        container.style.top =`${newY - startY}px`;
                    
                        const referenceLegend = document.elementsFromPoint(e2.x, e2.y).find(el => {
                            if (el.matches(`[data-layer-legend="true"]:not([data-layer-id="${layer._leaflet_id}"]`)) return el
                        })
                        
                        Array.from(layers.children).forEach(c => c.classList.toggle(
                            'highlight', 
                            Array(referenceLegend, container).includes(c)
                        )) 
                    }   
                    
                    const mouseUpHandler = (e3) => {
                        const offset = parseInt(container.style.top)
                        if (Math.abs(offset) >= 10) {
                            const referenceLegend = document.elementsFromPoint(e3.x, e3.y).find(el => {
                                if (el.matches(`[data-layer-legend="true"]:not([data-layer-id="${layer._leaflet_id}"]`)) return el
                            }) 
    
                            if (offset < 0) {
                                if (referenceLegend) {
                                    layers.insertBefore(container, referenceLegend)
                                } else {
                                    layers.insertBefore(container, layers.firstChild)
                                }
                            } else {
                                if (referenceLegend && referenceLegend.nextSibling) {
                                    layers.insertBefore(container, referenceLegend.nextSibling)
                                } else {
                                    layers.appendChild(container)
                                }
                            }
    
                            const layerLegends = Array.from(layers.children).reverse()
                            for (let i=0; i<layerLegends.length; i++) {
                                const child = layerLegends[i]
                                child.style.top = '0px'
                                
                                const paneName = child.dataset.layerPane
                                const pane = map.getPane(paneName)
                                pane.style.zIndex = i + 200
                            }
                        }

                        container.style.top = '0px'
                        container.classList.remove('z-3')
                        Array.from(layers.children).forEach(c => c.classList.remove('highlight')) 
                        document.body.classList.remove('user-select-none')
                    }                

                    Array('mousemove', 'touchmove').forEach(t2 => {
                        document.addEventListener(t2, mouseMoveHandler)
                    })                

                    Array('mouseup', 'touchend').forEach(t3 => {
                        document.addEventListener(t3, (e3) => {
                            mouseUpHandler(e3)
                            
                            Array('mousemove', 'touchmove').forEach(t2 => {
                                document.removeEventListener(t2, mouseMoveHandler)
                            })
                            
                            Array('mouseup', 'touchend').forEach(t3 => {
                                document.removeEventListener(t3, mouseUpHandler)
                            })
                        })
                    })                
                })
            })

            const toggleContainer = document.createElement('div')
            toggleContainer.className = 'ms-auto d-flex flex-nowrap gap-2'
            legendTitle.appendChild(toggleContainer)
            
            const legendCollapse = document.createElement('div')
            legendCollapse.id = `${container.id}-collapse`
            legendCollapse.className = 'collapse show ps-3'
            container.appendChild(legendCollapse)

            const legendDetails = document.createElement('div')
            legendDetails.id = `${container.id}-details`
            legendDetails.className = 'd-flex'
            legendCollapse.appendChild(legendDetails)
            
            const legendAttribution = document.createElement('div')
            legendAttribution.id = `${container.id}-attribution`
            legendAttribution.className = 'd-flex'
            legendAttribution.innerHTML = layer._attribution || ''
            legendCollapse.appendChild(legendAttribution)
    
            const collapseToggle = createIcon({
                parent: toggleContainer,
                peNone: false,
                className: 'dropdown-toggle ms-5'
            })
            collapseToggle.setAttribute('data-bs-toggle', 'collapse')
            collapseToggle.setAttribute('data-bs-target', `#${legendCollapse.id}`)
            collapseToggle.setAttribute('aria-controls', legendCollapse.id)
            collapseToggle.setAttribute('aria-expanded', 'true')

            const menuToggle = createIcon({
                parent: toggleContainer,
                peNone: false,
                className: 'bi bi-three-dots'
            })
            menuToggle.addEventListener('click', (e) => getLeafletLayerContextMenu(e, layer))
            
            if (layer instanceof L.GeoJSON) {
                layer.on('popupopen', (e) => {
                    layer._openpopup = e.popup
                })
                
                layer.on('popupclose', (e) => {
                    delete layer._openpopup 
                })
                
                layer.on('dataupdate', () => {
                    legendDetails.innerHTML = ''
                    createGeoJSONLayerLegend(
                        layer, 
                        legendDetails
                    )
                })
            }
        }

        if (layerIsVisible(layer)) {
            if (layer instanceof L.GeoJSON) {
                updateGeoJSONData(layer, {controller})
            }
        }

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

const handleLeafletStylePanel = (map, parent) => {
    const container = document.createElement('form')
    container.className = 'd-flex flex-grow-1 flex-column py-3'
    parent.appendChild(container)

    const selectContainer = document.createElement('div')
    selectContainer.className = 'd-flex px-3 flex-column'
    container.appendChild(selectContainer)

    const select = createFormFloating({
        parent: selectContainer,
        fieldTag: 'select', 
        fieldClassName: 'form-select-sm',
        fieldAttrs: {
            name: 'layer',
        },
        labelText: 'Layer'
    }).querySelector('select')

    const body = document.createElement('div')
    body.className = 'd-flex flex-column flex-grow-1 overflow-auto px-3'
    container.appendChild(body)

    let layer

    select.addEventListener('focus', () => {
        select.innerHTML = ''

        const mapContainer = map.getContainer()
        const legendContainer = mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers`)
        const legends = legendContainer.querySelectorAll(`[data-layer-legend="true"]`)
        const layers = Array.from(legends).map(l => {
            const leafletId = parseInt(l.dataset.layerId)
            return map._ch.getLegendLayer(leafletId)
        })
        
        layers.forEach(l => {
            const option = document.createElement('option')
            option.value = l._leaflet_id
            option.text = l._title
            select.appendChild(option)
        })
    })

    Array('change', 'blur').forEach(trigger => {
        select.addEventListener(trigger, () => {
            const newLayerId = parseInt(select.options[select.selectedIndex]?.value || -1)
            if (layer && newLayerId && newLayerId === layer._leaflet_id) return
    
            body.innerHTML = ''
            layer = map._ch.getLegendLayer(newLayerId)
            if (!layer) return

            const styleFields = {
                'Rendering': {
                    'Range of visibility': {
                        fields: {
                            'Minimum scale': {
                                fieldAttrs: {
                                    name:'minScale',
                                    type:'number',
                                    min: '0',
                                    max: layer._visibility?.max || '5000000',
                                    step: '10',
                                    value: layer._visibility?.min || '',
                                },
                                fieldClassName: 'form-control-sm',
                                events: {
                                    'change': (e) => {
                                        const field = e.target
                                        const maxScaleField = field.closest('form').elements.maxScale
                                        const maxScaleValue = parseInt(maxScaleField.value || 5000000)
                                        if (maxScaleValue && maxScaleValue < parseInt(field.value || 0)) field.value = maxScaleValue
        
                                        if (!layer._visibility) layer._visibility = {}
                                        layer._visibility.min = parseInt(field.value)
                                        maxScaleField.setAttribute('min', field.value)
        
                                        layerIsVisible(layer)
                                    }
                                }
                            },
                            'Maximum scale': {
                                fieldAttrs: {
                                    name:'maxScale',
                                    type:'number',
                                    min: layer._visibility?.min || '0',
                                    max: '5000000',
                                    step: '10',
                                    value: layer._visibility?.max || '',
                                },
                                fieldClassName: 'form-control-sm',
                                events: {
                                    'change': (e) => {
                                        const field = e.target
                                        const minScaleField = field.closest('form').elements.minScale
                                        const minScaleValue = parseInt(minScaleField.value || 0)
                                        if (minScaleValue && minScaleValue > parseInt(field.value || 5000000)) field.value = minScaleValue
                                        
                                        if (!layer._visibility) layer._visibility = {}
                                        layer._visibility.max = parseInt(field.value)
                                        minScaleField.setAttribute('max', field.value)
                                        
                                        layerIsVisible(layer)
                                    }
                                }
                            },
                        },
                        className: ''
                    }
                }
            }        
            
            Object.keys(styleFields).forEach(categoryName => {
                const category = document.createElement('div')
                category.className = `d-flex flex-column gap-2 mt-3`
                body.appendChild(category)

                const categorySections = document.createElement('div')
                categorySections.id =generateRandomString()
                categorySections.className = 'collapse show'

                const categoryHeader = document.createElement('div')
                categoryHeader.className = `d-flex fs-6`
                categoryHeader.setAttribute('data-bs-toggle', 'collapse')
                categoryHeader.setAttribute('aria-expanded', 'true')
                categoryHeader.setAttribute('data-bs-target', `#${categorySections.id}`)
                categoryHeader.setAttribute('aria-controls', categorySections.id)
                categoryHeader.style.cursor = 'pointer'
                
                const categoryLabel = document.createElement('span')
                categoryLabel.innerText = categoryName
                categoryHeader.appendChild(categoryLabel)
                
                const categoryDropdown = createIcon({
                    className:'dropdown-toggle ms-auto', 
                    parent:categoryHeader, 
                    peNone:true
                })

                category.appendChild(categoryHeader)
                category.appendChild(categorySections)
    
                const sections = styleFields[categoryName]
                Object.keys(sections).forEach(sectionName => {
                    const data = sections[sectionName]
        
                    const section = document.createElement('div')
                    section.className = `d-flex flex-column gap-2`
                    categorySections.appendChild(section)
    
                    const sectionHeader = document.createElement('span')
                    sectionHeader.style.fontSize = '14px'
                    sectionHeader.innerText = sectionName
                    section.appendChild(sectionHeader)
    
                    const sectionFields = document.createElement('div')
                    sectionFields.className = `d-flex flex-wrap gap-2 ${data.className}`
                    section.appendChild(sectionFields)
        
                    const fields = data.fields
                    Object.keys(fields).forEach(fieldName => {
                        createFormFloating({
                            ...fields[fieldName], 
                            labelText: fieldName,
                            parent: sectionFields,
                        })
                    })
                })
            })
        })
    }) 

}

const handleLeafletQueryPanel = (map, parent) => {
    const queryGroup = map._ch.getLayerGroups().query
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
        errorRemark: 'Query was interrupted.',
        clearLayersHandler: () => queryGroup.clearLayers(),
        toolHandler: async (e, handler) => {
            clearLayers(tools)
            
            if (typeof handler !== 'function') return
    
            const controllerId = resetController().id
    
            spinner.classList.remove('d-none')
            
            const cancelBtn = toolbar.querySelector(`#${toolbar.id}-cancel`)
            cancelBtn.disabled = false

            if (e.target instanceof L.Map === false) e._leafletMap = map
            const geojsons = await handler(e, {
                controller,
                abortBtns: [getCancelBtn()], 
            })
        
            cancelBtn.disabled = true
            
            if (controllerId !== controller.id) return
            
            if (geojsons && Object.values(geojsons).some(g => g?.features?.length)) {
                const content = await createGeoJSONChecklist(geojsons, queryGroup, {
                    controller, 
                    pane: 'queryPane',
                    customStyleParams: queryStyleParams, 
                })
                if (content) layers.appendChild(content)
            }
            
            spinner.classList.add('d-none')
            
            if (layers.innerHTML !== '' || queryGroup.getLayers().length > 0) {
                layers.classList.remove('d-none')

                toolbar.querySelector(`#${toolbar.id}-clear`).disabled = false

                if (layers.querySelectorAll('.collapse').length) {
                    toolbar.querySelector(`#${toolbar.id}-collapse`).disabled = false
                }
                
                if (layers.querySelectorAll('input.form-check-input[type="checkbox"]').length) {
                    Array('visibility', 'zoomin').forEach(toolName => {
                        toolbar.querySelector(`#${toolbar.id}-${toolName}`).disabled = false
                    })
                }
            } else {
                error.classList.remove('d-none')
            }
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
                
                const layer = await getLeafletGeoJSONLayer({
                    pane: 'queryPane',
                    geojson: feature, 
                    customStyleParams: queryStyleParams,
                    group: queryGroup,
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
            mapClickHandler: async (e, options={}) => {
                const event = e
                return await fetchGeoJSONs({
                    'OpenStreetMap via Nominatim': {
                        handler: fetchNominatim,
                        event,
                    },
                    'OpenStreetMap via Overpass': {
                        handler: fetchOverpass,
                        event,
                    },
                }, options)}
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            altShortcut: 'e',
            btnClickHandler: async (e, options={}) => {
                return await fetchGeoJSONs({
                    'OpenStreetMap via Overpass': {
                        handler: fetchOverpass,
                        event: e,
                    },
                }, options)
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
        divider2: {
            tag: 'div',
            className: 'vr m-2',
        },
        zoomin: {
            iconClass: 'bi bi-zoom-in',
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
            iconClass: 'bi bi-eye',
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
        handleLeafletStylePanel(map, body.querySelector(`#${body.id}-accordion-style .accordion-body`))
        
        return panel
    }
    
    control.addTo(map)
}