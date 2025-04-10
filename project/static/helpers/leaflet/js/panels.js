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
            customCreateElement({tag, ...data}) :
            createButton({...data,
                id: `${toolbar.id}-${toolId}`,
                className:`btn-sm btn-${getPreferredTheme()}`,
                events: {
                    click: async (event) => {
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
        clearLayersHandler: () => {
            map._ch.clearLegendLayers()
            disableStyleLayerSelect()
        }
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
    })

    const clearLegend = (layerLegend, isHidden, isInvisible) => {
        const legendDetails = layerLegend.querySelector(`#${layerLegend.id}-details`)
        legendDetails.innerHTML = ''

        if (isHidden) {
            createIcon({
                className: 'bi bi-eye-slash m-1',
                parent: legendDetails,
                peNone: false,
                title: 'Hidden',
            })
        }
        
        if (isInvisible) {
            createIcon({
                className: 'bi-exclamation-circle m-1',
                parent: legendDetails,
                peNone: false,
                title: 'Beyond visible range',
            })
        }
    }

    const mapContainer = map.getContainer()
    const getStyleBody = () => mapContainer.querySelector(`#${mapContainer.id}-panels-style-body`)

    const clearStyleBody = () => {
        const styleBody = getStyleBody()
        styleBody.innerHTML = ''
        styleBody.removeAttribute('data-layer-id')
        styleBody.classList.add('d-none')
    }

    const disableStyleLayerSelect = (disable=true) => {
        const styleAccordionSelector = `#${mapContainer.id}-panels-accordion-style`
        const styleAccordion = mapContainer.querySelector(styleAccordionSelector)
        const layerSelect = styleAccordion.querySelector(`select[name="layer"]`)
        layerSelect.disabled = disable
        
        if (disable) {
            layerSelect.innerHTML = ''
            clearStyleBody()
        }
    }

    map.on('movestart zoomstart', resetController)
    
    let timeout
    map.on('moveend zoomend', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            Array.from(layers.children).reverse().forEach(async legend => {
                const leafletId = parseInt(legend.dataset.layerId)
                const layer = map._ch.getLegendLayer(leafletId)
                if (!layer) return

                const isHidden = map._ch.hasHiddenLegendLayer(layer)
                const isInvisible = !layerIsVisible(layer)
                if (isHidden || isInvisible) {
                    clearLegend(legend, isHidden, isInvisible)
                    return
                }
                
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
        const layerLegend = layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
        if (!layerLegend) return
        
        const isHidden = map._ch.hasHiddenLegendLayer(layer)
        const isInvisible = map._ch.hasInvisibleLegendLayer(layer)
        if (isHidden || isInvisible) {
            clearLegend(layerLegend, isHidden, isInvisible)
            layer.options.renderer?._container?.classList.add('d-none')
        } else {
            layerLegend.remove()
            if (layers.innerHTML === '') clearLayers(tools)

            const styleLayerId = parseInt(getStyleBody().dataset.layerId || -1)
            if (styleLayerId === layer._leaflet_id) clearStyleBody()
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

            Array.from(legendAttribution.querySelectorAll('a')).forEach(a => a.setAttribute('target', '_blank'))
    
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
            disableStyleLayerSelect(false)
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
    const form = document.createElement('form')
    form.className = `d-flex flex-grow-1 flex-column text-bg-${getPreferredTheme()} rounded h-100`
    parent.appendChild(form)

    const toolbar = document.createElement('div')
    toolbar.className = 'd-flex p-3 flex-column gap-3'
    form.appendChild(toolbar)

    const select = createInputGroup({
        parent: toolbar,
        prefixHTML: 'Layer',
        fieldTag: 'select', 
        fieldClass: 'form-select-sm',
        fieldAttrs: {name: 'layer'},
        // labelText: 'Layer'
    }).querySelector('select')
    select.disabled = true

    const body = document.createElement('div')
    body.id = `${map.getContainer().id}-panels-style-body`
    body.className = 'd-flex flex-column flex-grow-1 overflow-auto p-3 d-none border-top gap-3'
    form.appendChild(body)

    let layer
    const mapContainer = map.getContainer()
    const getLayerLegend = () => mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers-${layer._leaflet_id}`)

    const visibilityFieldsClick = (e) => {
        const field = e.target

        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: true,
        })

        contextMenuHandler(e, {
            useCurrent: {
                innerText: `Use current map scale`,
                btnCallback: async () => {
                    const scale = getLeafletMeterScale(map)
                    field.value = scale
                    field.dispatchEvent(changeEvent)
                }
            },
            zoomCurrent: {
                innerText: `Zoom to nearest scale`,
                btnCallback: async () => {
                    const scale = field.value
                    zoomLeafletMapToScale(map, scale)
                }
            },
            useDefault: {
                innerText: `Use default scale`,
                btnCallback: async () => {
                    field.value = field.name === 'minScale' ? 10 : 5000000
                    field.dispatchEvent(changeEvent)
                }
            },
        })
    }

    const getSymbologyForm = (id) => {
        const legendLayer = getLayerLegend()
        const layerStyles = layer._styles
        const style = (layerStyles.groups?.[id]) || layerStyles.default
        const styleParams = style.styleParams

        const parent = customCreateElement({className:'d-flex gap-2 flex-column'})

        const groupFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })

        const label = createFormFloating({
            parent:groupFields,
            containerClass: 'w-100',
            fieldAttrs: {
                name: `${id}-label`,
                type: 'text',
                value: style.label
            },
            labelText: 'Label',
            fieldClass: 'form-control-sm',
            events: {
                blur: async (e) => {
                    const value = e.target.value.trim() 
                    if (value === style.label) return

                    style.label = value

                    const legendLabel = legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)
                    if (legendLabel) legendLabel.innerText = value
                }
            }
        })

        const groupBtns = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:groupFields
        })

        const toggleCount = createFormCheck({
            parent:groupBtns,
            labelInnerText: 'Show count',
            checked: style.showCount,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === style.showCount) return

                    style.showCount = value
                    
                    legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-count`)?.classList.toggle('d-none', !value)
                }
            }
        })

        // add remove button if id !== ''

        const conditionsFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })

        // add conditions if id !== ''

        const iconFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })
        
        const iconClass = createFormFloating({
            parent:iconFields,
            containerClass: 'w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-iconClass`,
                type: 'search',
                value: styleParams.iconClass,
                list: bootstrapIConsDatalist.id
            },
            fieldClass: 'form-control-sm',
            labelText: 'Icon class',
            events: {
                blur: (e) => {
                    let value = e.target.value.trim()
                    if (!value) value = e.target.value = 'circle-fill'
                    if (value === styleParams.iconClass) return
                    
                    styleParams.iconClass = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const iconSize = createInputGroup({
            parent:iconFields,
            fieldAttrs: {
                name: `${id}-iconSize`,
                type: 'number',
                min: '1',
                max: '100',
                step: '1',
                value: styleParams.iconSize,
                placeholder: 'Icon size',
            },
            suffixHTML: 'px',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value)
                    if (!value || value === styleParams.iconSize) {
                        e.target.value = styleParams.iconSize
                        return
                    }

                    styleParams.iconSize = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const iconCheckboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:iconFields
        })

        const iconShadow = createFormCheck({
            parent:iconCheckboxes,
            labelInnerText: 'Shadow effect',
            checked: styleParams.iconShadow,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconShadow) return

                    styleParams.iconShadow = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const iconGlow = createFormCheck({
            parent:iconCheckboxes,
            labelInnerText: 'Glow effect',
            checked: styleParams.iconGlow,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconGlow) return

                    styleParams.iconGlow = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const fillFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })

        const fillColor = createFormFloating({
            parent:fillFields,
            containerClass: 'w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-fillColor`,
                type: 'color',
                value: hslToHex(manageHSLAColor(styleParams.fillColor)),
            },
            fieldClass: 'form-control-sm',
            labelText: 'Fill color',
            events: {
                blur: (e) => {
                    const value = hexToHSLA(e.target.value)
                    if (value === styleParams.fillColor) return

                    styleParams.fillColor = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const fillOpacity = createInputGroup({
            parent:fillFields,
            fieldAttrs: {
                name: `${id}-fillOpacity`,
                type: 'number',
                min: '0',
                max: '100',
                step: '10',
                value: styleParams.fillOpacity * 100,
                placeholder: 'Fill opacity',
            },
            suffixHTML: '%',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = (parseFloat(e.target.value) / 100) || 0
                    if (value === styleParams.fillOpacity) return
                    
                    styleParams.fillOpacity = value
                    updateGeoJSONData(layer)
                }
            }
        })
        
        const strokeFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })
        
        const strokeColor = createFormFloating({
            parent:strokeFields,
            containerClass: 'w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-strokeColor`,
                type: 'color',
                value: hslToHex(manageHSLAColor(styleParams.strokeColor)),
            },
            fieldClass: 'form-control-sm',
            labelText: 'Stroke color',
            events: {
                blur: (e) => {
                    const value = hexToHSLA(e.target.value)
                    if (value === styleParams.strokeColor) return

                    styleParams.strokeColor = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const strokeOpacity = createInputGroup({
            parent:strokeFields,
            fieldAttrs: {
                name: `${id}-strokeOpacity`,
                type: 'number',
                min: '0',
                max: '100',
                step: '10',
                value: styleParams.strokeOpacity * 100,
                placeholder: 'Stroke opacity',
            },
            suffixHTML: '%',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = (parseFloat(e.target.value) / 100) || 0
                    if (value === styleParams.strokeOpacity) return

                    styleParams.strokeOpacity = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const strokeWidth = createInputGroup({
            parent:strokeFields,
            fieldAttrs: {
                name: `${id}-strokeWidth`,
                type: 'number',
                min: '0',
                max: '10',
                step: '1',
                value: styleParams.strokeWidth,
                placeholder: 'Stroke width',
            },
            suffixHTML: 'px',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value === styleParams.strokeWidth) return

                    styleParams.strokeWidth = value
                    updateGeoJSONData(layer)
                }
            }
        })
        
        const lineFields = customCreateElement({
            className:'d-flex gap-2',
            parent,
        })

        const lineCap = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineCap`},
            fieldClass: 'form-select-sm',
            labelText: 'Line cap',
            options: {
                'round': 'round',
                'butt': 'butt',
                'square': 'square',
            },
            currentValue: styleParams.lineCap,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineCap) return

                    styleParams.lineCap = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const lineJoin = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineJoin`},
            fieldClass: 'form-select-sm',
            labelText: 'Line join',
            options: {
                'round': 'round',
                'arcs': 'arcs',
                'bevel': 'bevel',
                'miter': 'miter',
                'miter-clip': 'miter-clip',
            },
            currentValue: styleParams.lineJoin,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineJoin) return

                    styleParams.lineJoin = value
                    updateGeoJSONData(layer)
                }
            }
        })

        const lineBreak = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineBreak`},
            fieldClass: 'form-select-sm',
            labelText: 'Line break',
            options: {
                'solid': 'solid',
                'dashed': 'dashed',
                'dotted': 'dotted',
            },
            currentValue: styleParams.lineBreak,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineBreak) return

                    styleParams.lineBreak = value
                    updateGeoJSONData(layer)
                }
            }
        })

        return parent
    }

    const getGeomFilterForm = (id) => {
        const layerStyles = layer._styles
        const filters = layerStyles.filters
        const filter = filters.geom.values[id]
        const parent = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
        })

        const enable = createFormCheck({
            parent,
            checked: filter.active,
            name: `geomFilter-enable-${id}`,
            disabled: !filters.geom.active,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.active) return

                    filter.active = value
                    if (filter.geometry) updateGeoJSONData(layer)
                }
            }
        })

        const intersect = createFormFloating({
            parent,
            fieldTag: 'select',
            fieldAttrs: {name: `geomFilter-intersect-${id}`},
            fieldClass: 'form-select-sm',
            labelText: 'Intersect',
            disabled: !filters.geom.active,
            options: {
                'true': 'True',
                'false': 'False',
            },
            currentValue: filter.intersect ? 'true' : 'false',
            events: {
                change: (e) => {
                    const value = e.target.value === 'true'
                    if (value === filter.intersect) return

                    filter.intersect = value
                    if (filter.active && filter.geometry) updateGeoJSONData(layer)
                }
            }
        })

        const geom = createFormFloating({
            parent,
            containerClass: 'flex-grow-1',
            fieldAttrs: {name: `geomFilter-geom-${id}`},
            fieldTag: 'textarea',
            fieldClass: 'mh-100',
            currentValue: JSON.stringify(filter.geometry),
            labelText: 'Geometry geojson',
            disabled: !filters.geom.active,
            events: {
                blur: (e) => {
                    let value
                    try {
                        value = JSON.parse(e.target.value)
                        if (!turf.booleanValid(value)) throw new Error('Invalid goemetry')
                        
                        let simplify = turf.coordAll(value).length > 50
                        if (simplify) {
                            let simplifiedGeom
                            let tolerance = 0
                            
                            while (simplify) {
                                tolerance += 0.001
                                try {
                                    simplifiedGeom = turf.simplify(value, {tolerance})
                                    simplify = turf.coordAll(simplifiedGeom).length > 50
                                } catch {
                                    throw new Error('Failed to simplify geometry')
                                }
                            }

                            value = simplifiedGeom
                            e.target.value = JSON.stringify(value)
                        }
                    } catch (error) {
                        e.target.value = value = null
                    }
                    
                    if (!value && !filter.geometry) return
                    if (value && filter.geometry && turf.booleanEqual(value, filter.geometry)) return
                    
                    filter.geometry = value
                    if (filter.active) updateGeoJSONData(layer)
                }
            }
        })

        const btnsContainer = customCreateElement({
            className:'d-flex flex-column justify-content-center pt-1', 
            parent,
        })

        const zoominBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconClass: 'bi bi bi-zoom-in',
            disabled: !filters.geom.active,
            name: `geomFilter-zoomin-${id}`,
            events: {
                click: (e) => {
                    if (!filter.geometry) return
                    zoomToLeafletLayer(L.geoJSON(filter.geometry), map)
                }
            }
        })

        const legendBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconClass: 'bi bi-plus-lg',
            disabled: !filters.geom.active,
            name: `geomFilter-legend-${id}`,
            events: {
                click: async (e) => {
                    if (!filter.geometry) return

                    const geojson = turf.featureCollection([{
                        type: 'Feature',
                        geometry: filter.geometry,
                        properties: {}
                    }])

                    const newLayer = await getLeafletGeoJSONLayer({
                        geojson,
                        title: 'spatial constraint',
                        pane: createCustomPane(map),
                        group: map._ch.getLayerGroups().client,
                    })

                    if (newLayer) newLayer._group.addLayer(newLayer)
                }
            }
        })

        const removeBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconClass: 'bi bi-trash-fill',
            disabled: !filters.geom.active,
            name: `geomFilter-remove-${id}`,
            events: {
                click: (e) => {
                    parent.remove()
                    const update = filter.active && filter.geometry
                    delete filters.geom.values[id]
                    if (update) updateGeoJSONData(layer)
                }
            }
        })

        return parent
    }

    select.addEventListener('focus', (e) => {
        select.innerHTML = ''

        const legendContainer = mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers`)
        const legends = legendContainer.querySelectorAll(`[data-layer-legend="true"]`)
        
        const option = document.createElement('option')
        option.value = '-1'
        option.text = 'Select a layer'
        select.appendChild(option)
        
        Array.from(legends).map(l => {
            const leafletId = parseInt(l.dataset.layerId)
            return map._ch.getLegendLayer(leafletId)
        }).forEach(l => {
            const option = document.createElement('option')
            option.value = l._leaflet_id
            option.text = l._title
            if (layer && layer._leaflet_id === l._leaflet_id) {
                option.setAttribute('selected', true)
            }
            select.appendChild(option)
        })
    })

    select.addEventListener('change', () => {
        const newLayerId = parseInt(select.value)
        if (layer && newLayerId && newLayerId === layer._leaflet_id) return

        body.innerHTML = ''
        layer = map._ch.getLegendLayer(newLayerId)
        if (!layer) {
            body.removeAttribute('data-layer-id')
            body.classList.add('d-none')
            return
        }

        body.setAttribute('data-layer-id', newLayerId)
        body.classList.remove('d-none')

        const layerLegend = getLayerLegend()
        const layerStyles = layer._styles
        const visibility = layerStyles.visibility
        const filters = layerStyles.filters
        const geomFilterContainerId = generateRandomString()

        const styleFields = {
            'Legend': {
                'Identification': {
                    fields: {
                        title: {
                            handler: createFormFloating,
                            containerClass: 'w-100',
                            fieldAttrs: {
                                type: 'text',
                                value: layer._title,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Title',
                            events: {
                                input: (e) => {
                                    const field = e.target
                                    layer._title = field.value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-title`)?.querySelector('span')
                                    if (element) element.innerText = field.value

                                    select.options[select.selectedIndex].text = field.value
                                }
                            }
                        },
                        attribution: {
                            handler: createFormFloating,
                            containerClass: 'w-100',
                            fieldTag: 'textarea',
                            currentValue: layer._attribution,
                            labelText: 'Attribution (HTML-frieldly)',
                            fieldStyle: {
                                minHeight: '100px', 
                            },
                            events: {
                                input: (e) => {
                                    const field = e.target

                                    const div = document.createElement('div')
                                    div.innerHTML = field.value
                                    Array.from(div.querySelectorAll('a')).forEach(a => {
                                        a.setAttribute('target', '_blank')
                                        
                                        const href = a.getAttribute('href')
                                        if (!href.startsWith('http')) a.setAttribute('href', `https://${href}`)
                                        
                                    })
                                    const value = div.innerHTML

                                    layer._attribution = value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-attribution`)
                                    element.innerHTML = value
                                }
                            }
                        },
                    },
                    className: 'flex-column gap-3'
                },
                'Symbology': {
                    fields: {   
                        method: {
                            handler: createFormFloating,
                            containerClass: 'w-100',
                            fieldAttrs: {
                                name:'method',
                            },
                            fieldTag:'select',
                            labelText: 'Method',
                            options:{
                                'uniform':'Uniform symbol',
                                // 'categorized':'Categorized symbols',
                                // 'ranged':'Ranged symbols',
                            },
                            currentValue: layerStyles.method,
                            fieldClass:'form-select-sm',
                            events: {
                                change: (e) => {
                                    const field = e.target
                                    layerStyles.method = field.value
                                    
                                    const container = field.parentElement.nextSibling
                                    container.innerHTML = ''
                                }
                            }
                        },
                        methodDetails: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({className:'w-100'})
                                container.appendChild(getSymbologyForm(''))
                                parent?.appendChild(container)
                            }
                        }
                    },
                    className: 'flex-column gap-3'
                },
            },
            'Rendering': {
                'Visibility': {
                    fields: {
                        enableScale: {
                            handler: createFormCheck,
                            checked: visibility.active,
                            formCheckClass: 'w-100',
                            labelInnerText: 'Enable scale-dependent rendering',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === visibility.active) return
                
                                    form.elements.minScale.disabled = !value
                                    form.elements.maxScale.disabled = !value

                                    visibility.active = value
                                    layerIsVisible(layer)
                                }
                            }
                        },
                        minScale: {
                            handler: createInputGroup,
                            fieldAttrs: {
                                name:'minScale',
                                type:'number',
                                min: '10',
                                max: visibility.max,
                                step: '10',
                                value: visibility.min,
                                placeholder: 'Maximum',
                            },
                            prefixHTML: '1:',
                            suffixHTML: 'm',
                            fieldClass: 'form-control-sm',
                            disabled: !visibility.active,
                            inputGroupClass: 'w-25 flex-grow-1',
                            events: {
                                'change': (e) => {
                                    const field = e.target
                                    const maxScaleField = form.elements.maxScale
                                    
                                    if (!field.value) {
                                        field.value = 10
                                    } else {
                                        const maxScaleValue = parseInt(maxScaleField.value)
                                        if (maxScaleValue < parseInt(field.value)) field.value = maxScaleValue
                                    }
    
                                    visibility.min = parseInt(field.value)
                                    maxScaleField.setAttribute('min', field.value)
    
                                    layerIsVisible(layer)
                                },
                                'click': visibilityFieldsClick,
                            }
                        },
                        maxScale: {
                            handler: createInputGroup,
                            fieldAttrs: {
                                name:'maxScale',
                                type:'number',
                                min: visibility.min,
                                max: '5000000',
                                step: '10',
                                value: visibility.max,
                                placeholder: 'Minimum',
                            },
                            prefixHTML: '1:',
                            suffixHTML: 'm',
                            fieldClass: 'form-control-sm',
                            disabled: !visibility.active,
                            inputGroupClass: 'w-25 flex-grow-1',
                            events: {
                                'change': (e) => {
                                    const field = e.target
                                    const minScaleField = form.elements.minScale
                                    
                                    if (!field.value) {
                                        field.value = 5000000
                                    } else {
                                        const minScaleValue = parseInt(minScaleField.value)
                                        if (minScaleValue > parseInt(field.value)) field.value = minScaleValue
                                    }
                                    
                                    visibility.max = parseInt(field.value)
                                    minScaleField.setAttribute('max', field.value)
                                    
                                    layerIsVisible(layer)
                                },
                                'click': visibilityFieldsClick,
                            }
                        },
                    },
                    className: 'flex-wrap gap-2'
                },
                'Filter': {
                    fields: {
                        enableType: {
                            handler: createFormCheck,
                            checked: filters.type.active,
                            formCheckClass: 'flex-grow-1',
                            labelInnerText: 'Filter by geometry type',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === filters.type.active) return
                
                                    Object.keys(form.elements).filter(i => i.startsWith('typeFilter-')).forEach(i => {
                                        form.elements[i].disabled = !value
                                    })

                                    filters.type.active = value
                                    updateGeoJSONData(layer)
                                }
                            }
                        },
                        toggleType: {
                            handler: createButton,
                            name: 'typeFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0',
                            iconClass: 'bi bi-toggles',
                            title: 'Toggle all types',
                            disabled: !filters.type.active,
                            events: {
                                click: () => {
                                    const fields = Object.values(form.elements).filter(f => {
                                        return (f.getAttribute('name') || '').startsWith('typeFilter-')
                                        && f.getAttribute('type') === 'checkbox'
                                    })
                                    const check = fields.some(f => !f.checked)

                                    fields.forEach(field => {
                                        field.checked = check
                                        
                                        const name = form.querySelector(`label[for="${field.id}"]`).innerText
                                        filters.type.values[name] = check
                                    })

                                    updateGeoJSONData(layer)
                                }
                            }
                        },
                        typeFilter: {
                            handler: createCheckboxOptions,
                            name: 'typeFilter',
                            containerClass: 'p-3 border rounded flex-wrap flex-grow-1 w-100 gap-2 mb-3',
                            options: (() => {
                                const options = {}
                                for (const type in filters.type.values) {
                                    options[type] = {
                                        checked: filters.type.values[type],
                                        disabled: !filters.type.active,
                                        events: {
                                            click: () => {
                                                Object.values(form.elements).filter(f => {
                                                    return (f.getAttribute('name') || '').startsWith('typeFilter-')
                                                    && f.getAttribute('type') === 'checkbox'
                                                }).forEach(field => {
                                                    const option = form.querySelector(`label[for="${field.id}"]`).innerText
                                                    filters.type.values[option] = field.checked
                                                })
                                                updateGeoJSONData(layer)
                                            }
                                        }
                                    }
                                }
                                return options
                            })()
                        },
                        enableGeom: {
                            handler: createFormCheck,
                            checked: filters.geom.active,
                            formCheckClass: 'flex-grow-1',
                            labelInnerText: 'Enable spatial constraints',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === filters.geom.active) return
                
                                    Object.keys(form.elements).filter(i => i.startsWith('geomFilter-')).forEach(i => {
                                        form.elements[i].disabled = !value
                                    })

                                    filters.geom.active = value
                                    if (Object.keys(filters.geom.values || {}).length) updateGeoJSONData(layer)
                                }
                            }
                        },
                        // bbox, new
                        bboxGeom: {
                            handler: createButton,
                            name: 'geomFilter-bbox',
                            className: 'fs-12 bg-transparent border-0 p-0',
                            iconClass: 'bi bi-bounding-box-circles',
                            title: 'Add map extent as spatial constraint',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const filter = filters.geom.values[generateRandomString()] = {
                                        active: true,
                                        intersect: true,
                                        geometry: L.rectangle(map.getBounds()).toGeoJSON().geometry
                                    }
                                    console.log(filter)
                                    // updateGeoJSONData(layer)                
                                }
                            }
                        },
                        toggleGeom: {
                            handler: createButton,
                            name: 'geomFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0',
                            iconClass: 'bi bi-toggles',
                            title: 'Toggle all spatial constraints',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const fields = Object.values(form.elements).filter(f => {
                                        return (f.getAttribute('name') || '').startsWith('geomFilter-')
                                        && f.getAttribute('type') === 'checkbox'
                                    })
                                    const check = fields.every(f => !f.checked)

                                    fields.forEach(field => {
                                        field.checked = check
                                    })

                                    Object.values(filters.geom.values).forEach(f => f.active = check)

                                    updateGeoJSONData(layer)
                                }
                            }
                        },
                        toggleGeom: {
                            handler: createButton,
                            name: 'geomFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0',
                            iconClass: 'bi bi-toggles',
                            title: 'Toggle all spatial constraints',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const fields = Object.values(form.elements).filter(f => {
                                        return (f.getAttribute('name') || '').startsWith('geomFilter-')
                                        && f.getAttribute('type') === 'checkbox'
                                    })
                                    const check = fields.every(f => !f.checked)

                                    fields.forEach(field => {
                                        field.checked = check
                                    })

                                    Object.values(filters.geom.values).forEach(f => f.active = check)

                                    updateGeoJSONData(layer)
                                }
                            }
                        },
                        removeGeom: {
                            handler: createButton,
                            name: 'geomFilter-remove',
                            className: 'fs-12 bg-transparent border-0 p-0',
                            iconClass: 'bi bi-trash-fill',
                            title: 'Remove all spatial constraints',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    body.querySelector(`#${geomFilterContainerId}`).innerHTML = ''
                                    const update = Object.values(filters.geom.values).some(f => f.active && f.geometry)
                                    filters.geom.values = {}
                                    if (update) updateGeoJSONData(layer)                
                                }
                            }
                        },
                        helperGeom: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    tag: 'p',
                                    className: 'd-flex w-100 user-select-none text-muted p-0 m-0',
                                    parent,
                                })

                                container.innerText = 'Using complex geometries as spatial constrains can make the map unresponsive; an input with more than 50 vertices will be simplified.'
                            }
                        },
                        geomFilter: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    id: geomFilterContainerId,
                                    className: 'd-flex w-100 gap-2 rounded mb-3',
                                    // style: {minHeight:'50px'},
                                    parent,
                                })  

                                for (const id in filters.geom.values) {
                                    container.appendChild(getGeomFilterForm(id))
                                }
                            }
                        },
                    },
                    className: 'flex-wrap gap-2'
                }
            }
        }        
        
        Object.keys(styleFields).forEach(categoryName => {
            const category = document.createElement('div')
            category.className = `d-flex flex-column gap-2`
            body.appendChild(category)

            const categoryCollase = document.createElement('div')
            categoryCollase.id =generateRandomString()
            categoryCollase.className = 'collapse show'

            const categoryHeader = document.createElement('div')
            categoryHeader.className = `d-flex fw-medium`
            categoryHeader.setAttribute('data-bs-toggle', 'collapse')
            categoryHeader.setAttribute('aria-expanded', 'true')
            categoryHeader.setAttribute('data-bs-target', `#${categoryCollase.id}`)
            categoryHeader.setAttribute('aria-controls', categoryCollase.id)
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
            category.appendChild(categoryCollase)

            const categorySections = document.createElement('div')
            categorySections.className = 'd-flex flex-column gap-3'
            categoryCollase.appendChild(categorySections)

            const sections = styleFields[categoryName]
            Object.keys(sections).forEach(sectionName => {
                const data = sections[sectionName]
    
                const section = document.createElement('div')
                section.className = `d-flex flex-column gap-2 flex-grow-1`
                categorySections.appendChild(section)

                const sectionHeader = document.createElement('span')
                sectionHeader.innerText = sectionName
                section.appendChild(sectionHeader)

                const sectionFields = document.createElement('div')
                sectionFields.className = `d-flex align-items-center w-100 ${data.className}`
                section.appendChild(sectionFields)
    
                const fields = data.fields
                Object.keys(fields).forEach(fieldName => {
                    const params = fields[fieldName]
                    if (params?.handler) params.handler({
                        ...params, 
                        parent: sectionFields,
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
                
                const checkboxes = layers.querySelectorAll('input.form-check-input[type="checkbox"]')
                if (checkboxes.length) {
                    toolbar.querySelector(`#${toolbar.id}-zoomin`).disabled = false
                    if (Array.from(checkboxes).some(c => !c.disabled)) {
                        toolbar.querySelector(`#${toolbar.id}-visibility`).disabled = false
                    }
                }
            } else {
                error.classList.remove('d-none')
            }
        }
    })

    const queryStyleParams = {
        fillColor: 'hsla(111, 100%, 54%, 1)',
        strokeWidth: 1,
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
                    geojson: feature, 
                    pane: 'queryPane',
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