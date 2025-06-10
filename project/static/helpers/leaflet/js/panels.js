const createLeafletMapPanel = (map, parent, name, {
    statusBar = false,
    spinnerRemark = '',
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
    layers.className = `flex-grow-1 overflow-auto p-3 d-none border-top rounded-bottom text-bg-${getPreferredTheme()} d-flex flex-column gap-2`
    layers.style.minHeight = '90px'
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
        error.appendChild(errorRemarkDiv)    
    }

    template.clearLayers = async (tools) => {
        layers.innerHTML = ''
        layers.classList.add('d-none')

        await clearLayersHandler?.()
            
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
                className: data.className ?? `btn-sm btn-${getPreferredTheme()}`,
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
                        
                        if (!skipToolHandler) {
                            btn.classList.toggle('btn-primary', mapClickHandler)
                            btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                        }

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

const handleLeafletLegendPanel = async (map, parent) => {
    const {
        toolbar, 
        layers,
        clearLayers,
        toolsHandler,
    } = createLeafletMapPanel(map, parent, 'legend', {
        clearLayersHandler: async () => {
            await map._ch.clearLegendLayers()
            disableStyleLayerSelect()
        }
    })

    let controller = resetController()

    const tools = toolsHandler({
        zoomin: {
            iconSpecs: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            disabled: true,
            btnClickHandler: async () => await map._ch.zoomToLegendLayers(),
        },
        visibility: {
            iconSpecs: 'bi bi-eye',
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
            iconSpecs: 'bi bi-chevron-up',
            title: 'Collapse/expand',
            disabled: true,
            btnClickHandler: () => toggleCollapseElements(layers),
        },
        toggleLegends: {
            iconSpecs: 'bi bi-list-task',
            title: 'Toggle legends',
            disabled: true,
            btnClickHandler: () => {
                const elements = Array.from(layers.children)
                const show = elements.some(el => el.classList.contains('d-none'))
                elements.forEach(el =>  el.classList.toggle('d-none', !show))
                layers.classList.toggle('d-none', !show)
                const checkbox = getStyleBody().querySelector('[name="showLegend"]')
                if (checkbox) checkbox.checked = show
            },
        },
        toggleAttribution: {
            iconSpecs: 'bi bi-c-circle',
            title: 'Toggle attributions',
            disabled: true,
            btnClickHandler: () => {
                const elements = Array.from(layers.children).map(container => {
                    return container.querySelector(`#${container.id}-attribution`)
                })
                const show = elements.some(el => el.classList.contains('d-none'))
                elements.forEach(el =>  el.classList.toggle('d-none', !show))
                const checkbox = getStyleBody().querySelector('[name="showAttr"]')
                if (checkbox) checkbox.checked = show
            },
        },
        clear: {
            iconSpecs: 'bi-trash-fill',
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
        divider2: {
            tag: 'div',
            className: 'me-5',
        },
        addLayers: {
            iconSpecs: 'bi-stack',
            title: 'Add new layers',
            innerText: 'Add layers',
            toolHandler: false,
            className: 'ms-auto d-flex flex-nowrap gap-2 fs-10 badge align-items-center btn btn-sm btn-success',
            btnClickHandler: (e) => {
                const modalElement = document.querySelector(`#addLayersModal`)
                modalElement.querySelector('form')._leafletMap = map

                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
                modalInstance.show()
            }            
        },
    })

    const clearLegend = (layerLegend, {isHidden=false, isInvisible=false, error=false} = {}) => {
        if (!layerLegend) return

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
        
        if (error) {
            createIcon({
                className: 'bi-bug m-1',
                parent: legendDetails,
                peNone: false,
                title: 'Data source error',
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
        const layerSelect = styleAccordion?.querySelector(`select[name="layer"]`)
        if (layerSelect) layerSelect.disabled = disable
        
        if (layerSelect && disable) {
            layerSelect.innerHTML = ''
            clearStyleBody()
        }
    }

    let timeout
    map.on('movestart zoomstart', () => {
        clearTimeout(timeout)
        controller = resetController({controller, message: 'Map moved.'})
    })
    
    map.on('moveend zoomend', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            const newBbox = turf.bboxPolygon(getLeafletMapBbox(map))
            
            const controllerId = controller.id
            const promises = []

            Array.from(layers.children).reverse().forEach(legend => {
                if (controllerId !== controller.id) return
                
                const leafletId = parseInt(legend.dataset.layerId)
                const layer = map._ch.getLegendLayer(leafletId)
                if (!layer) return

                const isHidden = map._ch.hasHiddenLegendLayer(layer)
                const isInvisible = !leafletLayerIsVisible(layer)
                if (isHidden || isInvisible) {
                    return clearLegend(legend, {isHidden, isInvisible})
                }

                if (layer instanceof L.GeoJSON) {
                    if (controllerId !== controller.id) return
                    if (legend.querySelector('.bi-bug')) return

                    promises.push(updateLeafletGeoJSONLayer(layer, {
                        geojson: (
                            map._previousBbox && turf.booleanWithin(newBbox, map._previousBbox) && layer.getLayers().length
                            ? layer.toGeoJSON() : null
                        ),
                        controller,
                        updateCache: false,
                    }).then(() => {
                        if (layer && layer._openpopup) {
                            layer._openpopup.openOn(map)
                            delete layer._openpopup
                        }
                    }))
                } else if (layer._params.legend) {
                    const details = legend.querySelector(`#${legend.id}-details`)
                    if (turf.booleanIntersects(newBbox, L.rectangle(layer.getBounds()).toGeoJSON())) {
                        if (details.innerHTML === '' || details.firstChild.tagName === 'I') {
                            details.innerHTML = ''
                            const img = new Image()
                            img.src = layer._params.legend
                            details.appendChild(img)
                        }
                    } else {
                        clearLegend(legend)
                    }
                }   
            })

            Promise.all(promises).then(() => {
                map._previousBbox = newBbox
                sessionStorage.setItem(`map-bbox-${map.getContainer().id}`, JSON.stringify(newBbox))
            })
        }, 500)
    })

    map.on('layerremove', (event) => {
        const layer = event.layer
        if (!map._legendLayerGroups.includes(layer._group)) return

        const layerLegend = layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
        
        const isHidden = map._ch.hasHiddenLegendLayer(layer)
        const isInvisible = map._ch.hasInvisibleLegendLayer(layer)
        
        if ((isHidden || isInvisible)) {
            clearLegend(layerLegend, {isHidden, isInvisible})
            layer.options.renderer?._container?.classList.add('d-none')
        } else {
            if (layerLegend) {
                layerLegend.remove()
                if (layers.innerHTML === '') clearLayers(tools)
            }
            
            const styleLayerId = parseInt(getStyleBody()?.dataset.layerId ?? -1)
            if (styleLayerId === layer._leaflet_id) clearStyleBody()

            if (layer instanceof L.GeoJSON) {
                deleteLeafletLayerFillPatterns(layer)
            }

            map._ch.updateCachedLegendLayers({handler: (i) => delete i[layer._leaflet_id]})
        }
    })

    map.on('layeradd', (event) => {
        const layer = event.layer
        if (!map._ch.hasLegendLayer(layer)) return
        
        const isGeoJSON = layer instanceof L.GeoJSON

        let container = layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)
        if (!container) {
            const paneName = layer.options.pane
            const pane = map.getPane(paneName)
            pane.style.zIndex = layers.children.length + 200
            
            map._ch.updateCachedLegendLayers({layer})

            container = document.createElement('div')
            container.id = `${layers.id}-${layer._leaflet_id}`
            container.setAttribute('data-layer-legend', "true")
            container.setAttribute('data-layer-pane', paneName)
            container.setAttribute('data-layer-id', layer._leaflet_id)
            container.className = `d-flex flex-nowrap flex-column gap-1 mb-2 position-relative ${layer?._properties?.info?.showLegend !== false ? '' : 'd-none'}`
            layers.insertBefore(container, layers.firstChild)
            
            const legendTitle = document.createElement('div')
            legendTitle.id = `${container.id}-title`
            legendTitle.className = 'd-flex flex-nowrap gap-2'
            legendTitle.appendChild(createSpan(layer._params.title, {className:'text-break text-wrap'}))
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
    
                            const zIdnexUpdate = {}
                            const layerLegends = Array.from(layers.children).reverse()
                            for (let i=0; i<layerLegends.length; i++) {
                                const child = layerLegends[i]
                                child.style.top = '0px'
                                
                                const paneName = child.dataset.layerPane
                                const pane = map.getPane(paneName)
                                pane.style.zIndex = i + 200
                                
                                zIdnexUpdate[child.dataset.layerId] = pane.style.zIndex
                            }

                            map._ch.updateCachedLegendLayers({handler: (i) => Object.keys(zIdnexUpdate).forEach(j => i[j].zIndex = zIdnexUpdate[j])})
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
            legendAttribution.className = `d-flex ${layer?._properties?.info?.showAttribution != false ? '' : 'd-none'}`
            legendAttribution.innerHTML = layer._params.attribution ?? ''
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
            
            if (isGeoJSON) {
                layer.on('dataupdating', () => {
                    legendDetails.innerHTML = ''
                    legendDetails.appendChild(customCreateElement({
                        className: 'py-1 d-flex flex-nowrap',
                        innerHTML: '<div class="spinner-border spinner-border-sm" role="status"></div><div class="ms-2"></div>'
                    }))
                })

                layer.on('dataupdate', () => {
                    legendDetails.innerHTML = ''
                    createGeoJSONLayerLegend(
                        layer, 
                        legendDetails
                    )
                })
                
                layer.on('dataerror', () => {
                    layer.clearLayers()
                    clearLegend(container, {error: true})
                })
            }
        }

        if (!isGeoJSON && layer._params.legend) {
            const details = container.querySelector(`#${container.id}-details`)
            if (turf.booleanIntersects(
                (map._previousBbox ?? turf.bboxPolygon(getLeafletMapBbox(map))), 
                L.rectangle(layer.getBounds()).toGeoJSON()
            )) {
                if (details.innerHTML === '' || details.firstChild.tagName === 'I') {
                    details.innerHTML = ''
                    const img = new Image()
                    img.src = layer._params.legend
                    details.appendChild(img)
                }
            } else {
                clearLegend(container)
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

    await map._ch.addCachedLegendLayers()
    layers.classList.toggle('d-none', Array.from(layers.children).every(el => el.classList.contains('d-none')))   
}

const handleLeafletStylePanel = (map, parent) => {
    let controller = resetController()

    const form = document.createElement('form')
    form.className = `d-flex flex-grow-1 flex-column text-bg-${getPreferredTheme()} rounded h-100`
    parent.appendChild(form)

    const toolbar = document.createElement('div')
    toolbar.className = 'd-flex p-3 flex-c olumn gap-3'
    form.appendChild(toolbar)

    const select = createInputGroup({
        parent: toolbar,
        prefixHTML: 'Layer',
        suffixHTML: `<div class='d-flex flex-nowrap gap-2'></div>`,
        fieldTag: 'select', 
        fieldClass: 'form-select-sm',
        fieldAttrs: {name: 'layer'},
        // labelText: 'Layer'
    }).querySelector('select')
    select.disabled = true

    const styleOptions = select.nextElementSibling
    styleOptions.appendChild(createIcon({
        peNone: false,
        className: 'bi bi-copy',
        events: {
            click: () => {
                navigator.clipboard.writeText(JSON.stringify(layer._properties))
            }
        }
    }))
    styleOptions.appendChild(createIcon({
        peNone: false,
        className: 'ms-3 bi bi-clipboard',
        events: {
            click: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    const _properties = JSON.parse(text)
                    if (!Object.keys(layer._properties).every(i => {
                        return Object.keys(_properties).includes(i)
                    })) return
    
                    const oldStyles = structuredClone(layer._properties)
                    layer._properties = cloneLeafletLayerStyles({_properties})
                    deleteLeafletLayerFillPatterns({_properties:oldStyles})
                    updateLeafletGeoJSONLayer(layer, {
                        geojson: layer.toGeoJSON()
                    })

                    const event = new Event("change", { bubbles: true })
                    select.dispatchEvent(event)
                } catch { return }
            }
        }
    }))

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

    const updateSymbology = async (styleParams, {refresh=true, updateCache=true}={}) => {
        const controllerId = controller.id

        await handleStyleParams(styleParams, {controller})
        
        if (refresh && controllerId === controller.id) {
            updateLeafletGeoJSONLayer(layer, {
                geojson: layer.toGeoJSON(),
                controller,
                updateCache,
            }).then(() => {
                map.setZoom(map.getZoom())
            })
        }

        return styleParams
    }

    const getSymbologyForm = (id) => {
        const legendLayer = getLayerLegend()

        const symbology = layer._properties?.symbology
        const style = (symbology?.groups?.[id]) || symbology?.default
        const styleParams = style?.styleParams
        const collapseId = generateRandomString()

        let updateTimeout
        const update = async () => {
            console.log('pre timeout')
            clearTimeout(updateTimeout)
            updateTimeout = setTimeout(() => {
                console.log('post timeout')
                updateSymbology(style.active ? styleParams : null)
                updateTimeout = null
            }, 1000)
        }

        const parent = customCreateElement({
            className:'d-flex flex-column flex-grow-1',
        })

        parent.addEventListener('focusin', (e) => {
            if (!updateTimeout) return
            if (!e.target.getAttribute('name')) return
            update()
        })

        const toggleFields = customCreateElement({
            className:'d-flex gap-3 align-items-center',
            parent,
        })

        if (id !== '') {
            const enableGroup = createFormCheck({
                parent: toggleFields,
                checked: style.active,
                formCheckClass: 'flex-grow-1',
                // labelInnerText: 'Enable group',
                role: 'switch',
                events: {
                    click: (e) => {
                        const value = e.target.checked
                        if (value === style.active) return
    
                        style.active = value
                        update()
                    }
                }
            })

            const rank = createBadgeSelect({
                parent: toggleFields,
                selectClass: `ms-auto border-0 p-0 pe-1 text-end text-bg-${getPreferredTheme()}`,
                attrs: {name: `${id}-rank`},
                options: (() => {
                    const options = {   }
                    
                    for (let i = 0; i < Object.keys(symbology.groups).length; i++) {
                        options[i+1] = i+1
                    }
                    
                    return options
                })(),
                currentValue: String(style.rank),
                events: {
                    change: (e) => {
                        let value = parseInt(e.target.value)
                        if (isNaN(value)) e.target.value = value = style.rank
                        if (value === style.rank) return
                        
                        style.rank = value
                        update()
                    }
                }
            })
        } else {
            const defaultLabel = createSpan('Default', {
                parent: toggleFields,
                className: 'fs-12 fw-medium text-muted user-select-none mb-2',
            })
        }

        const copyBtn = createIcon({
            className: `bi bi-copy ${id === '' ? 'ms-auto' : ''}`, 
            parent:toggleFields, 
            peNone:false,
            title: 'Copy group symbology',
            events: {
                click: (e) => {
                    const text = JSON.stringify(styleParams)
                    navigator.clipboard.writeText(text)
                }
            }
        })

        const pasteBtn = createIcon({
            className:'bi bi-clipboard', 
            parent:toggleFields, 
            peNone:false,
            title: 'Paste group symbology',
            events: {
                click: async (e) => {
                    const text = await navigator.clipboard.readText()
                    if (!text) return
    
                    try {
                        const newStyleParams = getLeafletStyleParams(JSON.parse(text))

                        if (!Object.keys(styleParams).every(i => {
                            return Object.keys(newStyleParams).includes(i)
                        })) throw new Error('Invalid style params')


                        style.styleParams = await updateSymbology({
                            ...newStyleParams,
                            fillPatternId: styleParams.fillPatternId
                        }, {refresh:style.active})

                        parent.parentElement.insertBefore(getSymbologyForm(id), parent)
                        parent.remove()               
                    } catch (error) {
                        console.log(error)
                    }  
                }
            }
        })

        if (id !== '') {
            const deleteBtn = createIcon({
                className:'bi bi-trash-fill text-danger', 
                parent:toggleFields, 
                peNone:false,
                title: 'Remove group',
                events: {
                    click: (e) => {
                        const menuContainer = contextMenuHandler(e, {
                            confirm: {
                                innerText: `Confirm to remove group`,
                                btnCallback: async () => {
                                    parent.remove()
                                    document.querySelector(`#${styleParams.fillPatternId}`)?.remove()
                                    delete symbology.groups[id]
                                    style.active = false
                                    update()
                                }
                            },            
                        })
                        menuContainer.classList.add('bg-danger')        
                    }
                }
            })
        }

        createIcon({
            className:'dropdown-toggle', 
            parent:toggleFields, 
            peNone:false,
            attrs: {
                'data-bs-toggle': 'collapse',
                'aria-expanded': style.rank === 1 ? 'true' : 'false',
                'data-bs-target': `#${collapseId}`,
                'aria-controls': collapseId,
            },
        })

        const headerFields = customCreateElement({
            className:'d-flex gap-2 align-items-center mb-2',
            style: {cursor:'pointer'},
            parent,
        })

        const label = createFormFloating({
            parent:headerFields,
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

                    map._ch.updateCachedLegendLayers({layer})
                }
            }
        })

        const groupChecks = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:headerFields
        })

        const toggleLabel = createFormCheck({
            parent:groupChecks,
            labelInnerText: 'Show label',
            checked: style.showLabel,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === style.showLabel) return

                    style.showLabel = value
                    legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)?.classList.toggle('d-none', !value)

                    map._ch.updateCachedLegendLayers({layer})
                }
            }
        })

        const toggleCount = createFormCheck({
            parent:groupChecks,
            labelInnerText: 'Show count',
            checked: style.showCount,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === style.showCount) return

                    style.showCount = value
                    legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-count`)?.classList.toggle('d-none', !value)

                    map._ch.updateCachedLegendLayers({layer})
                }
            }
        })

        const collapseDiv = customCreateElement({
            id: collapseId,
            className:`accordion-collapse collapse ${style.rank === 1 ? 'show' : ''} border-start border-3 ps-2`,
            attrs: {'data-bs-parent':`#${body.id}-methodDetails`},
            parent,
        })

        const fieldsContainer = customCreateElement({
            className:'d-flex flex-column gap-2',
            parent: collapseDiv,
        })

        const iconFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconType = createFormFloating({
            parent: iconFields,
            containerClass: 'w-25 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-iconType`},
            fieldClass: 'form-select-sm',
            labelText: 'Icon type',
            options: {
                'bi': 'bootstrap icon',
                'text': 'text',
                'emoji': 'emoji',
                'img': 'image url',
                'svg': 'svg element',
                'html': 'html element',
                'property': 'feature property',
            },
            currentValue: styleParams.iconType,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.iconType) return

                    const iconSpecs = parent.querySelector(`[name="${id}-iconSpecs"]`)
                    if (value === 'bi') {
                        iconSpecs.value = 'circle-fill'
                        styleParams.iconSpecs = 'circle-fill'
                    } else {
                        iconSpecs.value = ''
                        styleParams.iconSpecs = ''
                    }

                    styleParams.iconType = value
                    updateIconDatalistOptions()
                    update()
                    
                }
            }
        })

        const iconDatalist = customCreateElement({
            tag:'datalist', 
            parent:iconFields,
        })

        const updateIconDatalistOptions = async () => {
            iconDatalist.innerHTML = ''

            const iconType = styleParams.iconType

            if (iconType === 'bi') {
                setBootstrapIconsAsOptions(iconDatalist)
            } 

            if (iconType === 'property') {
                // update to retrieve properties from wfs/wms
                const geojson = (await getLeafletGeoJSONData(layer, {
                    controller,
                    queryGeom:false,
                    group:false,
                    sort:false,
                    simplify:false
                })) || layer.toGeoJSON()
                if (geojson) {
                    const options = []
                    turf.propEach(geojson, (currentProperties, featureIndex) => {
                        Object.keys(currentProperties).forEach(i => options.push(i))
                    })

                    const sortedOptions = [...(options.length ? new Set(options) : [])].sort()
                        
                    for (const i of sortedOptions) {
                        const option = document.createElement('option')
                        option.value = i
                        iconDatalist.appendChild(option)
                    }
                }
            }
        }

        const iconSpecs = createFormFloating({
            parent: iconFields,
            containerClass: 'd-flex w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-iconSpecs`,
                type: 'search',
                value: styleParams.iconSpecs,
                list: (() => {
                    updateIconDatalistOptions()
                    return iconDatalist.id
                })()
            },
            fieldClass: 'form-control-sm',
            labelText: 'Icon',
            events: {
                change: (e) => {
                    let value = e.target.value.trim()
                    console.log(value)
                    if (!value && styleParams.iconType === 'bi') {
                        value = e.target.value = 'circle-fill'
                    }
                    
                    styleParams.iconSpecs = value
                    update()
                }
            }
        })

        const iconFields2 = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconSize = createInputGroup({
            parent:iconFields2,
            inputGroupClass: 'w-25 flex-grow-1',
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
                    update()
                }
            }
        })

        const iconRotation = createInputGroup({
            parent:iconFields2,
            inputGroupClass: 'w-25 flex-grow-1',
            fieldAttrs: {
                name: `${id}-iconRotation`,
                type: 'number',
                min: '0',
                max: '359',
                step: '15',
                value: styleParams.iconRotation,
                placeholder: 'Icon rotation',
            },
            suffixHTML: '°',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value === styleParams.iconRotation) return
                    
                    styleParams.iconRotation = value
                    update()
                }
            }
        })

        const patternCheckboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:iconFields2
        })

        const iconFill = createFormCheck({
            parent:patternCheckboxes,
            labelInnerText: 'Icon fill',
            checked: styleParams.iconFill,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconFill) return

                    styleParams.iconFill = value
                    update()
                }
            }
        })

        const iconStroke = createFormCheck({
            parent:patternCheckboxes,
            labelInnerText: 'Icon stroke',
            checked: styleParams.iconStroke,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconStroke) return

                    styleParams.iconStroke = value
                    update()
                }
            }
        })

        const iconFields3 = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconCheckboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:iconFields3
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
                    update()
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
                    update()
                }
            }
        })
     
        const textCheckboxes = customCreateElement({
            className:'d-flex flex-column flex-wrap justify-content-center border px-3 rounded pt-1 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:iconFields3
        })

        const textWrap = createFormCheck({
            parent:textCheckboxes,
            formCheckClass:'me-3',
            labelInnerText: 'Text wrap',
            checked: styleParams.textWrap,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.textWrap) return

                    styleParams.textWrap = value
                    update()
                }
            }
        })
        
        const fontSerif = createFormCheck({
            parent:textCheckboxes,
            labelInnerText: 'Font serif',
            checked: styleParams.fontSerif,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.fontSerif) return

                    styleParams.fontSerif = value
                    update()
                }
            }
        })

        const boldFont = createFormCheck({
            parent:textCheckboxes,
            labelInnerText: 'Bold font',
            checked: styleParams.boldFont,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.boldFont) return

                    styleParams.boldFont = value
                    update()
                }
            }
        })

        const italicFont = createFormCheck({
            parent:textCheckboxes,
            labelInnerText: 'Italic font',
            checked: styleParams.italicFont,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.italicFont) return

                    styleParams.italicFont = value
                    update()
                }
            }
        })

        const fillFields = customCreateElement({
            className:'d-flex gap-2 flex-wrap',
            parent: fieldsContainer,
        })

        const fillColor = createFormFloating({
            parent:fillFields,
            containerClass: 'w-10 flex-grow-1',
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
                    update()
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
            inputGroupClass: 'w-25 flex-grow-1',
            events: {
                blur: (e) => {
                    const value = (parseFloat(e.target.value) / 100) || 0
                    if (value === styleParams.fillOpacity) return
                    
                    styleParams.fillOpacity = value
                    update()
                }
            }
        })

        const fillPattern = createFormFloating({
            parent: fillFields,
            containerClass: 'w-10 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-fillPattern`},
            fieldClass: 'form-select-sm',
            labelText: 'Fill pattern',
            options: {
                'solid': 'solid',
                'icon': 'icon',
            },
            currentValue: styleParams.fillPattern,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.fillPattern) return

                    styleParams.fillPattern = value
                    update()
                }
            }
        })

        const patternBgFields = customCreateElement({
            className:'border rounded p-2 d-flex justify-content-center align-items-center gap-1 w-25 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:fillFields
        })

        const patternBg = createFormCheck({
            parent: patternBgFields,
            labelInnerText: 'Pattern background',
            checked: styleParams.patternBg,
            labelClass: 'text-wrap text-start',
            formCheckClass: 'fs-10',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.patternBg) return

                    patternBgColor.disabled = !value

                    styleParams.patternBg = value
                    update()
                }
            }
        })

        const patternBgColor = (() => {
            const input = document.createElement('input')
            input.className = 'p-0'
            input.disabled = !styleParams.patternBg
            input.setAttribute('name',`${id}-patternBgColor`)
            input.setAttribute('type',`color`)
            input.value = hslToHex(manageHSLAColor(styleParams.patternBgColor))
            input.addEventListener('blur', (e) => {
                const value = hexToHSLA(e.target.value)
                if (value === styleParams.patternBgColor) return

                styleParams.patternBgColor = value
                update()
            })
            patternBgFields.appendChild(input)
            return input
        })()

        const strokeFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
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
                    update()
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
                    update()
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
                    update()
                }
            }
        })
        
        const lineFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
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
                    update()
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
                    update()
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

                    const strokeWidth = styleParams.strokeWidth
                    styleParams.dashArray = value === 'solid' ? null : `${
                        value === 'dashed' 
                        ? (strokeWidth * 5) 
                        : (((Math.ceil(strokeWidth)) - 1) || 1)
                    } ${strokeWidth * 3}`

                    styleParams.lineBreak = value
                    update()
                }
            }
        })

        return parent
    }

    const updateSymbologyGroups = async () => {
        controller = resetController({controller, message: 'New symbology method update.'})
        const controllerId = controller.id

        const spinner = body.querySelector(`#${body.id}-symbologySpinner`)
        spinner.classList.remove('d-none')

        const symbology = layer._properties.symbology
        if (symbology.groups) {
            Object.values(symbology.groups).forEach(i => {
                document.querySelector(`svg#svgFillDefs defs#${i.styleParams.fillPatternId}`)?.remove()
            })
            delete symbology.groups
        }

        const container = body.querySelector(`#${body.id}-methodDetails`)
        container.innerHTML = ''

        if (symbology.method !== 'single' && symbology.groupBy?.length) {
            const geojson = (await getLeafletGeoJSONData(layer, {
                controller,
                queryGeom:false,
                group:false,
                sort:false,
                simplify:false
            })) || layer.toGeoJSON()
            
            if (controllerId !== controller.id) return

            if (geojson && (symbology.method === 'categorized')) {
                let groups = []
                geojson?.features?.forEach(feature => {
                    const values = Object.fromEntries(symbology.groupBy.map(i => [i, ((e) => {
                        if (i === '[geometry_type]') return feature.geometry.type
                        
                        let value = removeWhitespace(String(feature.properties[i] ?? '[undefined]'))
                        if (symbology.case === false) value = value.toLowerCase()
                        return value === '' ? '[blank]' : value
                    })()]))
    
                    groups.push(JSON.stringify(values))
                })

                if (controllerId !== controller.id) return

                const groupsSetSorted = (groups.length ? [...new Set(groups)] : []).sort((a, b) => {
                    const countOccurrences = (item, search) => item.split(search).length-1
                    const aCount = countOccurrences(a, '[undefined]') + countOccurrences(a, '[blank]')
                    const bCount = countOccurrences(b, '[undefined]') + countOccurrences(b, '[blank]')
                    return aCount !== bCount ? aCount - bCount : (a.localeCompare(b))
                })

                const count = groupsSetSorted.length
                if (count && count <= 20) {
                    symbology.default.rank = count + 1
                    if (count) {
                        symbology.groups = {}
                        
                        let rank = 0
                        for (const group of groupsSetSorted) {
                            if (controllerId !== controller.id) return

                            rank +=1
                            const filters = JSON.parse(group)

                            const styleParams = await updateSymbology(getLeafletStyleParams({
                                ...symbology.default.styleParams,
                                fillColor: removeWhitespace(`hsla(
                                    ${Math.round(Math.random()*(
                                        ((360/count*rank)-(360/count*0.75))-(360/count*(rank-1))
                                    ))+(360/count*(rank-1))},
                                    ${Math.round(Math.random()*(100-75))+75}%,
                                    ${Math.round(Math.random()*(55-45))+45}%,
                                1)`),
                                fillOpacity: 0.5,
                                strokeColor: true,
                                strokeOpacity: 1,
                                patternBgColor: null,
                                fillPatternId: null,
                            }), {refresh:false, updateCache:false})
        
                            if (controllerId !== controller.id) return
                            if (!symbology.groups) return
                            
                            symbology.groups[generateRandomString()] = {
                                active: true,
                                label: Object.values(filters).join(', '),
                                showCount: true,
                                showLabel: true,
                                rank,
                                styleParams,
                                filters: {
                                    type: (() => {
                                        const value = {active: false, values: {
                                            Point: true,
                                            MultiPoint: true,
                                            LineString: true,
                                            MultiLineString: true,
                                            Polygon: true,
                                            MultiPolygon: true,
                                        }}
        
                                        if (Object.keys(filters).includes('[geometry_type]')) {
                                            value.active = true
                                            Object.keys(value.values).forEach(i => {
                                                value.values[i] = i === filters['[geometry_type]']
                                            })
                                        }
                                        
                                        return value
                                    })(),
                                    properties: (() => {
                                        const value = {active: false, values: {}, operator: '&&'}
        
                                        const propertyFilters = Object.keys(filters).filter(i => i !== '[geometry_type]')
                                        if (propertyFilters.length) {
                                            value.active = true
                                            propertyFilters.forEach(i => {
                                                value.values[generateRandomString()] = {
                                                    active: true,
                                                    property: i,
                                                    handler: 'equals',
                                                    value: true,
                                                    case: symbology.case,
                                                    values: [filters[i]]
                                                }
                                            })
                                        }
                                        
                                        return value
                                    })(),
                                    geom: {active: false, values: {}, operator: '&&'},
                                },
                            }
                        }
                    }
                }
            }
            
            if (geojson && (symbology.method === 'graduated')) {
                const property = symbology.groupBy[0]
                const validFeatures = geojson.features.filter(i => !isNaN(parseFloat(i.properties[property] ?? '')))
                if (validFeatures.length) {
                    if (controllerId !== controller.id) return
                    
                    const values = validFeatures.map(i => parseFloat(i.properties[property] ?? ''))
                    const min = Math.min(...values)
                    const max = Math.max(...values)
                    const diff = max - min
                    const groupCount = symbology.groupCount = form.elements.groupCount.value = diff === 0 ? 1 : symbology.groupCount || 5
                    const interval = diff === 0 ? 0 : diff/(groupCount-1)
                    const precision = symbology.groupPrecision = form.elements.groupPrecision.value = diff === 0 
                    ? 1 : symbology.groupPrecision || Number(`1${'0'.repeat(Math.floor((String(interval).length)/2))}`)

                    const groups = []
                    let currentMin = min
                    while (currentMin < max || !groups.length) {
                        if (controllerId !== controller.id) break

                        const currentMax = Math.round((currentMin + interval)/precision) * precision

                        groups.push({
                            min: currentMin,
                            max: currentMax > max ? max : currentMax
                        })
                        currentMin = currentMax
                    }

                    if (controllerId !== controller.id) return

                    const count = groups.length
                    if (count && count <= 20) {
                        symbology.default.rank = groups.length + 1
                        if (groups.length) {
                            const hslaColor = manageHSLAColor(generateRandomColor())

                            symbology.groups = {}
                            
                            let rank = 0
                            for (const filters of groups) {
                                if (controllerId !== controller.id) return

                                rank +=1
                                
                                const styleParams = await updateSymbology(getLeafletStyleParams({
                                    ...symbology.default.styleParams,
                                    fillColor: hslaColor.toString({l:20+(((80-20)/(groups.length-1 || 1))*(rank-1))}),
                                    fillOpacity: 0.5,
                                    strokeColor: true,
                                    strokeOpacity: 1,
                                    patternBgColor: null,
                                    fillPatternId: null,
                                    iconStroke: false,
                                    iconSize: 10 + (((50-10)/(groups.length-1 || 1))*(rank-1)),
                                    strokeWidth: 1 + (((5-1)/(groups.length-1 || 1))*(rank-1))
                                }), {refresh:false, updateCache:false})

                                if (controllerId !== controller.id) return
                                if (!symbology.groups) return
            
                                symbology.groups[generateRandomString()] = {
                                    active: true,
                                    label: `${formatNumberWithCommas(filters.min)} - ${formatNumberWithCommas(filters.max)}`,
                                    showCount: true,
                                    showLabel: true,
                                    rank,
                                    styleParams,
                                    filters: {
                                        type: {active: false, values: {
                                            Point: true,
                                            MultiPoint: true,
                                            LineString: true,
                                            MultiLineString: true,
                                            Polygon: true,
                                            MultiPolygon: true,
                                        }},
                                        properties: (() => {
                                            const value = {active: true, values: {}, operator: '&&'}
            
                                            value.values[generateRandomString()] = {
                                                active: true,
                                                property,
                                                handler: 'greaterThanEqualTo',
                                                value: true,
                                                case: true,
                                                values: [filters.min]
                                            }
            
                                            value.values[generateRandomString()] = {
                                                active: true,
                                                property,
                                                handler: 'lessThanEqualTo',
                                                value: true,
                                                case: true,
                                                values: [filters.max]
                                            }
                                            
                                            return value
                                        })(),
                                        geom: {active: false, values: {}, operator: '&&'},
                                    },
                                }
                            }
                        }
                    }
                }
            }
        }

        Array(...Object.keys(symbology.groups ?? {}), '').forEach(i => {
            if (controllerId !== controller.id) return
            container.appendChild(getSymbologyForm(i))
        })

        spinner.classList.add('d-none')

        if (controllerId !== controller.id) return
        updateLeafletGeoJSONLayer(layer, {
            geojson: layer.toGeoJSON(),
            controller,
        })
    }

    const getGeomFilterForm = (id) => {
        const filters = layer._properties.filters
        const filter = filters.geom.values[id]

        const parent = customCreateElement({className:'d-flex gap-2 flex-column'})

        const paramsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const enable = createFormCheck({
            parent: paramsFields,
            checked: filter.active,
            name: `geomFilter-enable-${id}`,
            disabled: !filters.geom.active,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.active) return

                    filter.active = value
                    if (filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const handler = createFormFloating({
            parent: paramsFields,
            containerClass:'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {
                name: `geomFilter-handler-${id}`,
            },
            fieldClass: 'form-select-sm',
            labelText: 'Relation',
            labelClass: 'text-nowrap',
            disabled: !filters.geom.active,
            options: {
                'booleanIntersects': 'intersects',
                'booleanEqual': 'equals',
                'booleanTouches': 'touches',
                'booleanWithin': 'within',
                'booleanContains': 'contains',
            },
            currentValue: filter.handler,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === filter.handler) return

                    filter.handler = value
                    if (filter.active && filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const checkboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',
            style: {height: '58px'},
            parent:paramsFields
        })

        const value = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Relation is true',
            checked: filter.value,
            labelClass: 'text-nowrap',
            disabled: !filters.geom.active,
            name: `geomFilter-value-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.value) return

                    filter.value = value
                    if (filter.active && filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const geomsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const btnsContainer = customCreateElement({
            parent:geomsFields,
            className:'d-flex flex-column justify-content-center pt-1 me-1', 
        })

        const zoominBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi bi-zoom-in',
            disabled: !filters.geom.active,
            name: `geomFilter-zoomin-${id}`,
            events: {
                click: (e) => {
                    if (!filter.geoms?.length) return
                    zoomToLeafletLayer(L.geoJSON(turf.featureCollection(filter.geoms.map(i => turf.feature(i)))), map)
                }
            }
        })

        const legendBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi-plus-lg',
            disabled: !filters.geom.active,
            name: `geomFilter-legend-${id}`,
            events: {
                click: async (e) => {
                    if (!filter.geoms?.length) return

                    const geojson = turf.featureCollection(filter.geoms.map(i => turf.feature(i)))

                    const addLayers = await getLeafletGeoJSONLayer({
                        geojson,
                        params: {title: 'spatial constraint'},
                        pane: createCustomPane(map),
                        group: map._ch.getLayerGroups().client,
                        customStyleParams: {
                            fillOpacity: 0,
                            strokeWidth: 3,
                            strokeColor: generateRandomColor()
                        },
                    })

                    if (addLayers) addLayers._group.addLayer(addLayers)
                }
            }
        })

        const removeBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi-trash-fill',
            disabled: !filters.geom.active,
            name: `geomFilter-remove-${id}`,
            events: {
                click: (e) => {
                    parent.remove()
                    const update = filter.active && filter.geoms?.length
                    delete filters.geom.values[id]
                    if (update) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const geom = createFormFloating({
            parent: geomsFields,
            containerClass: 'flex-grow-1',
            fieldAttrs: {name: `geomFilter-geom-${id}`},
            fieldTag: 'textarea',
            fieldClass: 'fs-12',
            fieldStyle: {minHeight:'100px'},
            currentValue: (filter.geoms ?? []).map(i => JSON.stringify(i)).join(','),
            labelText: 'Comma-delimited geometries',
            disabled: !filters.geom.active,
            events: {
                blur: (e) => {
                    e.target.classList.remove('is-invalid')

                    let value
                    try {
                        value = e.target.value.trim()
                        if (!value.startsWith('[')) value = `[${value}`
                        if (!value.endsWith(']')) value = `${value}]`

                        value = JSON.parse(value)

                        if (!value.every(i => turf.booleanValid(i))) throw new Error('Invalid goemetry')
                        
                        value = value.map(i => {
                            i = i.type === 'Feature' ? i.geometry : i
                            
                            let simplify = turf.coordAll(i).length > 100
                            if (simplify) {
                                let simplifiedGeom
                                let tolerance = 0

                                while (simplify) {
                                    tolerance += 0.001
                                    try {
                                        simplifiedGeom = turf.simplify(i, {tolerance})
                                        simplify = turf.coordAll(simplifiedGeom).length > 100
                                    } catch {
                                        return
                                    }
                                }

                                i = simplifiedGeom
                            }

                            return i
                        }).filter(i => i)

                        e.target.value = value.map(i => JSON.stringify(i)).join(',')
                    } catch (error) {
                        console.log(error)
                        e.target.classList.add('is-invalid')
                        value = null
                    }
                    
                    if (!value && !filter.geoms?.length) return
                    if (value && filter.geoms && filter.geoms.length 
                        && value.every(i => filter.geoms.find(g => turf.booleanEqual(i, g)))
                        && filter.geoms.every(i => value.find(g => turf.booleanEqual(i, g)))
                    ) return
                    
                    filter.geoms = value
                    if (filter.active) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        return parent
    }

    const getPropertyFilterForm = (id) => {
        const filters = layer._properties.filters
        const filter = filters.properties.values[id]
        
        const parent = customCreateElement({className:'d-flex gap-2 flex-column'})
        
        const paramsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const enable = createFormCheck({
            parent: paramsFields,
            checked: filter.active,
            name: `propFilter-enable-${id}`,
            disabled: !filters.properties.active,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.active) return

                    filter.active = value
                    if (filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const property = createFormFloating({
            parent: paramsFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `propFilter-property-${id}`},
            fieldClass: 'form-select-sm',
            labelText: 'Property',
            disabled: !filters.properties.active,
            options: {[filter.property || '']:filter.property || ''},
            currentValue: filter.property || '',
            events: {
                focus: async (e) => {
                    const field = e.target
                    field.innerHTML = ''

                    // update to fetch properties from wfs (wms?)
                    const options = []
                    const geojson = (await getLeafletGeoJSONData(layer, {
                        controller,
                        filter:false,
                        queryGeom:false,
                        group:false,
                        sort:false,
                        simplify:false
                    })) || layer.toGeoJSON()
                    turf.propEach(geojson, (currentProperties, featureIndex) => {
                        Object.keys(currentProperties).forEach(i => options.push(i))
                    })

                    const optionsSet = options.length ? new Set(options) : []
                    const sortedOptions = [...optionsSet].sort()

                    for (const i of sortedOptions) {
                        const option = document.createElement('option')
                        option.value = i
                        option.text = i
                        if (i === field.property) option.setAttribute('selected', true)
                        field.appendChild(option)
                    }
                },
                blur: (e) => {
                    const value = e.target.value
                    if (value === filter.property) return

                    filter.property = value
                    if (filter.active && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const handler = createFormFloating({
            parent: paramsFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `propFilter-handler-${id}`},
            fieldClass: 'form-select-sm',
            labelText: 'Relation',
            disabled: !filters.properties.active,
            options: {
                'equals': 'equals',
                'contains': 'contains',
                'greaterThan': 'greater than',
                'greaterThanEqualTo': 'greater than or equal to',
                'lessThan': 'less than',
                'lessThanEqualTo': 'less than or equal to',
            },
            currentValue: filter.handler,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === filter.handler) return

                    filter.handler = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const checkboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',
            style: {height: '58px'},
            parent:paramsFields
        })

        const value = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Relation is true',
            checked: filter.value,
            labelClass: 'text-nowrap',
            disabled: !filters.properties.active,
            name: `propFilter-value-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.value) return

                    filter.value = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const caseSensitive = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Case-sensitive',
            checked: filter.case,
            labelClass: 'text-nowrap',
            disabled: !filters.properties.active,
            name: `propFilter-case-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.case) return

                    filter.case = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })


        const valueFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const removeBtn = createButton({
            parent: valueFields,
            className: 'fs-12 bg-transparent border-0 p-0 me-1',
            iconSpecs: 'bi bi-trash-fill',
            disabled: !filters.properties.active,
            name: `propFilter-remove-${id}`,
            events: {
                click: (e) => {
                    parent.remove()
                    delete filters.properties.values[id]
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const values = createTagifyField({
            parent: valueFields,
            inputClass: `w-100 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1`,
            inputTag: 'textarea',
            delimiters: null,
            enabled: 0,
            disabled: !filters.properties.active,
            dropdownClass:  `my-1 border-0`,
            userInput: true,
            scopeStyle: {
                minHeight: '58px',
            },
            name:  `propFilter-values-${id}`,
            placeholder: 'Select property values',
            currentValue: JSON.stringify((filter.values || []).map(i => {return {value:i}})),
            events: {
                focus: async (e) => {
                    const tagify = Tagify(form.elements[`propFilter-values-${id}`])
                    
                    const options = []
    
                    if (Array('equals').includes(filter.handler) && filter.property) {
                        const geojson = (await getLeafletGeoJSONData(layer, {
                            controller,
                            filter:false,
                            queryGeom:false,
                            group:false,
                            sort:false,
                            simplify:false
                        })) || layer.toGeoJSON()
                        turf.propEach(geojson, (currentProperties, featureIndex) => {
                            let value = removeWhitespace(String(currentProperties[filter.property] ?? '[undefined]'))
                            value = value === '' ? '[blank]' : value

                            if (!filter.values.includes(value)) options.push(String(value))
                        })
                    }
                    
                    const optionsSet = options.length ? new Set(options) : []
                    const sortedOptions = [...optionsSet].sort()
    
                    tagify.settings.whitelist = sortedOptions
                },
            },
            callbacks: {
                ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                    const tagify = e.detail.tagify
                    const values = tagify.value.map(i => i.value)
        
                    if (values.every(i => filter.values.includes(i))
                        && filter.values.every(i => values.includes(i))
                    ) return
        
                    filter.values = values
                    if (filter.active && filter.property) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }])))() //, 'add', 'remove', 'edit'
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
            option.className = 'text-wrap text-break text-truncate'
            option.value = l._leaflet_id
            option.text = l._params.title
            if (layer && layer._leaflet_id === l._leaflet_id) {
                option.setAttribute('selected', true)
            }
            select.appendChild(option)
        })
    })

    select.addEventListener('change', () => {
        const addLayersId = parseInt(select.value)

        body.innerHTML = ''
        layer = map._ch.getLegendLayer(addLayersId)
        if (!layer) {
            body.removeAttribute('data-layer-id')
            body.classList.add('d-none')
            return
        }

        body.setAttribute('data-layer-id', addLayersId)
        body.classList.remove('d-none')

        const layerLegend = getLayerLegend()
        const layerStyles = layer._properties
        const symbology = layerStyles.symbology 
        const visibility = layerStyles.visibility
        const filters = layerStyles.filters
        const info = layerStyles.info
        const filterContainerId = generateRandomString()

        const styleFields = {
            'Legend': {
                'Identification': {
                    fields: {
                        title: {
                            handler: createFormFloating,
                            containerClass: 'w-25 flex-grow-1',
                            fieldAttrs: {
                                type: 'text',
                                value: layer._params.title,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Title',
                            events: {
                                change: (e) => {
                                    const field = e.target
                                    layer._params.title = field.value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-title`)?.querySelector('span')
                                    if (element) element.innerText = field.value

                                    select.options[select.selectedIndex].text = field.value

                                    map._ch.updateCachedLegendLayers({layer})
                                }
                            }
                        },
                        idChecks: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    parent,
                                    className: 'd-flex flex-column justify-content-center w-10 flex-grow-1 border rounded px-3 pt-1',
                                    style: {height:'58px'}
                                })

                                const layerLegend = getLayerLegend()
                                const attribution = layerLegend.querySelector(`#${layerLegend.id}-attribution`)

                                container.appendChild(createFormCheck({
                                    checked: layer?._properties?.info?.showLegend !== false,
                                    labelInnerText: 'Show legend',
                                    labelClass: 'text-nowrap',
                                    role: 'checkbox',
                                    name: 'showLegend',
                                    events: {
                                        click: (e) => {
                                            const layers = layerLegend.parentElement
                                            layerLegend.classList.toggle('d-none')
                            
                                            layers.classList.toggle(
                                                'd-none', 
                                                Array.from(layers.children)
                                                .every(el => el.classList.contains('d-none'))
                                            )                    

                                            layer._properties.info.showLegend = e.target.checked
                                            map._ch.updateCachedLegendLayers({layer})
                                        }
                                    }
                                }))

                                container.appendChild(createFormCheck({
                                    checked: layer?._properties?.info?.showAttribution !== false,
                                    labelInnerText: 'Show attribution',
                                    labelClass: 'text-nowrap',
                                    role: 'checkbox',
                                    name: 'showAttr',
                                    events: {
                                        click: (e) => {
                                            attribution.classList.toggle('d-none')
                                            layer._properties.info.showAttribution = e.target.checked
                                            map._ch.updateCachedLegendLayers({layer})
                                        }
                                    }
                                }))
                            }
                        },
                        attribution: {
                            handler: createFormFloating,
                            containerClass: 'w-100 flex-grow-1',
                            fieldTag: 'textarea',
                            currentValue: layer._params.attribution,
                            labelText: 'Attribution (HTML-frieldly)',
                            fieldClass: 'fs-12',
                            fieldStyle: {
                                minHeight: '100px', 
                            },
                            events: {
                                change: (e) => {
                                    const field = e.target

                                    const div = document.createElement('div')
                                    div.innerHTML = field.value
                                    Array.from(div.querySelectorAll('a')).forEach(a => {
                                        a.setAttribute('target', '_blank')
                                        
                                        const href = a.getAttribute('href')
                                        if (!href.startsWith('http')) a.setAttribute('href', `https://${href}`)
                                        
                                    })
                                    const value = div.innerHTML

                                    layer._params.attribution = value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-attribution`)
                                    element.innerHTML = value

                                    map._ch.updateCachedLegendLayers({layer})
                                }
                            }
                        },
                    },
                    className: 'gap-2 flex-wrap'
                },
                'Symbology': {
                    fields: {   
                        method: {
                            handler: createFormFloating,
                            containerClass: 'w-25',
                            fieldAttrs: {
                                name:'method',
                            },
                            fieldTag:'select',
                            labelText: 'Method',
                            options:{
                                'single':'Single',
                                'categorized':'Categorized',
                                'graduated':'Graduated',
                                // 'rule':'Rule-based',
                            },
                            currentValue: symbology.method,
                            fieldClass:'form-select-sm',
                            events: {
                                change: (e) => {
                                    const field = e.target
                                    const value = field.value
                                    symbology.method = value
                                    
                                    const tagifyObj = Tagify(form.elements.groupBy)
                                    const tagifyElement = tagifyObj.DOM.scope
                                    if (value === 'single') {
                                        tagifyElement.setAttribute('disabled', true)
                                    } else {
                                        const maxTags = value === 'categorized' ? 5 : 1
                                        tagifyObj.settings.maxTags = maxTags

                                        if (tagifyObj.value.length > maxTags) tagifyObj.removeAllTags()

                                        tagifyElement.removeAttribute('disabled')
                                    }

                                    body.querySelector(`#${body.id}-graduatedParams`).classList.toggle('d-none', value !== 'graduated')
                                    body.querySelector(`#${body.id}-categoryParams`).classList.toggle('d-none', value !== 'categorized')

                                    if (value === 'single' || symbology.groupBy?.length) updateSymbologyGroups()
                                }
                            }
                        },
                        groupBy: {
                            handler: createTagifyField,
                            inputClass: `w-25 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                            inputTag: 'textarea',
                            enabled: 0,
                            disabled: symbology.method === 'single',
                            dropdownClass:  `my-1 border-0`,
                            userInput: true,
                            maxTags: symbology.method === 'categorized' ? 5 : 1,
                            scopeStyle: {
                                height: '58px',
                            },
                            name:  `groupBy`,
                            placeholder: 'Select properties',
                            currentValue: JSON.stringify((symbology.groupBy || []).map(i => {return {value:i}})),
                            events: {
                                focus: async (e) => {
                                    const geojson = (await getLeafletGeoJSONData(layer, {
                                        controller,
                                        filter:false,
                                        queryGeom:false,
                                        group:false,
                                        sort:false,
                                        simplify:false
                                    })) || layer.toGeoJSON()
                                    if (!geojson) return
                                    
                                    const tagify = Tagify(form.elements['groupBy'])
                                    const options = symbology.method === 'categorized' ? ['[geometry_type]'] : []
                                    turf.propEach(geojson, (currentProperties, featureIndex) => {
                                        Object.keys(currentProperties).forEach(i => options.push(String(i)))
                                    })
                                    const optionsSet = options.length ? new Set(options) : []
                                    const sortedOptions = [...optionsSet].filter(i => {
                                        return !(symbology.groupBy || []).includes(i)
                                    }).sort()
                                    tagify.settings.whitelist = sortedOptions
                                },
                            },
                            callbacks: {
                                ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                    const tagify = e.detail.tagify
                                    const values = tagify.value.map(i => i.value)
                        
                                    if (values.every(i => symbology.groupBy.includes(i)) && symbology.groupBy.every(i => values.includes(i)) ) return
                        
                                    symbology.groupBy = values
                                    updateSymbologyGroups()
                                }])))() // , 'add', 'remove', 'edit'
                            }
                        },
                        categoryParams: {
                            handler: ({parent}={}) => {
                                const div = customCreateElement({
                                    parent,
                                    id: `${body.id}-categoryParams`,
                                    style: {width:'20%', height:'58px'},
                                    className: `d-flex flex-column justify-content-center gap-1 w-25 border rounded px-3 py-1 ${symbology.method !== 'categorized' ? 'd-none' : ''}`
                                })

                                div.appendChild(createFormCheck({
                                    checked: symbology.case,
                                    formCheckClass: 'w-100',
                                    labelInnerText: 'Case-sensitive',
                                    events: {
                                        click: (e) => {
                                            const value = e.target.checked
                                            if (value === symbology.case) return
                                            
                                            symbology.case = value
                                            updateSymbologyGroups()
                                        }
                                    }
                                }))
                            }
                        },
                        graduatedParams: {
                            handler: ({parent}={}) => {
                                const div = customCreateElement({
                                    parent,
                                    id: `${body.id}-graduatedParams`,
                                    style: {width:'20%', height:'58px'},
                                    className: `d-flex flex-column justify-content-between gap-1 w-25 ${symbology.method !== 'graduated' ? 'd-none' : ''}`
                                })

                                div.appendChild(createFormFloating({
                                    fieldAttrs: {
                                        name:'groupCount',
                                        type:'number',
                                        value: symbology.groupCount ?? '',
                                        placeholder: 'No. of groups',
                                    },
                                    fieldClass: `py-1 px-2 fs-10`,
                                    events: {
                                        'blur': (e) => {
                                            const value = parseInt(e.target.value)
                                            if (value === symbology.groupCount) return
                                            
                                            symbology.groupCount = value
                                            updateSymbologyGroups()
                                        },
                                    }
                                }).firstChild)
                                
                                div.appendChild(createFormFloating({
                                    fieldAttrs: {
                                        name:'groupPrecision',
                                        type:'number',
                                        value: symbology.groupPrecision ?? '',
                                        placeholder: 'Precision',
                                    },
                                    fieldClass: `py-1 px-2 fs-10`,
                                    events: {
                                        'blur': (e) => {
                                            const value = parseInt(e.target.value)
                                            if (value === symbology.groupPrecision) return

                                            symbology.groupPrecision = value
                                            updateSymbologyGroups()
                                        },
                                    }
                                }).firstChild)
                            }
                        },
                        spinner: {
                            handler: ({parent}={}) => {
                                const div = customCreateElement({
                                    id: `${body.id}-symbologySpinner`, 
                                    className:'spinner-border spinner-border-sm d-none mx-2', 
                                    attrs: {role:'status'}
                                })
                                parent.appendChild(div)
                            },
                        },
                        collapse: {
                            handler: createIcon,
                            className:'dropdown-toggle ms-auto', 
                            peNone: false,
                            attrs: {
                                'data-bs-toggle': 'collapse',
                                'aria-expanded': 'true',
                                'data-bs-target': `#${body.id}-methodDetails-collapse`,
                                'aria-controls': `${body.id}-methodDetails-collapse`,
                            },
                            style: {cursor:'pointer'},
                            events: {
                                click: (e) => {
                                    const collapse = document.querySelector(e.target.getAttribute('data-bs-target'))
                                    if (collapse.classList.contains('show')) return
                                    Array.from(collapse.querySelectorAll('.collapse')).forEach(i => {
                                        bootstrap.Collapse.getOrCreateInstance(i).hide()
                                    })
                                }
                            }
                        },
                        methodDetails: {
                            handler: ({parent}={}) => {
                                const collapse = customCreateElement({
                                    id:`${body.id}-methodDetails-collapse`,
                                    className:'collapse show w-100',
                                    parent,
                                })

                                const container = customCreateElement({
                                    id:`${body.id}-methodDetails`,
                                    className:'w-100 d-flex flex-column accordion gap-3',
                                    parent:collapse,
                                })
                                
                                if (symbology.method === 'single') {
                                    container.appendChild(getSymbologyForm(''))
                                } else {
                                    const groupIds = Object.entries(symbology.groups || {}).sort(([keyA, valueA], [keyB, valueB]) => {
                                        return valueA.rank - valueB.rank
                                    }).map(i => i[0])

                                    Array(...groupIds, '').forEach(i => {
                                        container.appendChild(getSymbologyForm(i))
                                    })
                                }
                            }
                        }
                    },
                    className: 'gap-2 flex-wrap'
                },
                'Feature Interactivity': {
                    fields: {
                        enableTooltip: {
                            handler: createFormCheck,
                            checked: info.tooltip.active,
                            formCheckClass: 'w-100 flex-grow-1 mt-2',
                            labelInnerText: 'Tooltip',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === info.tooltip.active) return
                
                                    info.tooltip.active = value
                                    updateLeafletGeoJSONLayer(layer, {
                                        geojson: value ? layer.toGeoJSON() : null,
                                        controller,
                                    })
                                }
                            }
                        },
                        tooltipProps: {
                            handler: createTagifyField,
                            inputClass: `w-50 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                            inputTag: 'textarea',
                            enabled: 0,
                            dropdownClass: `my-1 border-0`,
                            userInput: true,
                            maxTags: 5,
                            scopeStyle: {
                                height: '58px',
                            },
                            name:  `tooltipProps`,
                            placeholder: 'Select properties',
                            currentValue: JSON.stringify((info.tooltip.properties || []).map(i => {return {value:i}})),
                            events: {
                                focus: async (e) => {
                                    const geojson = (await getLeafletGeoJSONData(layer, {
                                        controller,
                                        filter:false,
                                        queryGeom:false,
                                        group:false,
                                        sort:false,
                                        simplify:false
                                    })) || layer.toGeoJSON()
                                    if (!geojson) return
                                    
                                    const tagify = Tagify(form.elements['tooltipProps'])
                                    const options = []
                                    turf.propEach(geojson, (currentProperties, featureIndex) => {
                                        Object.keys(currentProperties).forEach(i => options.push(String(i)))
                                    })
                                    const optionsSet = options.length ? new Set(options) : []
                                    const sortedOptions = [...optionsSet].filter(i => {
                                        return !(info.tooltip.properties || []).includes(i)
                                    }).sort()
                                    tagify.settings.whitelist = sortedOptions
                                },
                            },
                            callbacks: {
                                ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                    const tagify = e.detail.tagify
                                    const values = tagify.value.map(i => i.value)
                        
                                    if (values.every(i => info.tooltip.properties.includes(i)) && info.tooltip.properties.every(i => values.includes(i)) ) return
                        
                                    info.tooltip.properties = values
                                    if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                        geojson: layer.toGeoJSON(),
                                        controller,
                                    })
                                }])))()
                            }
                        },
                        tooltipDel: {
                            handler: createFormFloating,
                            containerClass: 'w-10 flex-grow-1',
                            fieldAttrs: {
                                type: 'text',
                                value: info.tooltip.delimiter,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Delimiter',
                            labelClass: 'text-wrap',
                            events: {
                                change: (e) => {
                                    const value = e.target.value
                                    if (value === info.tooltip.delimiter) return
                
                                    info.tooltip.delimiter = value
                                    if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                        geojson: layer.toGeoJSON(),
                                        controller,
                                    })
                                }
                            }
                        },
                        tooltipPrefix: {
                            handler: createFormFloating,
                            containerClass: 'w-10 flex-grow-1',
                            fieldAttrs: {
                                type: 'text',
                                value: info.tooltip.prefix,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Prefix',
                            labelClass: 'text-wrap',
                            events: {
                                change: (e) => {
                                    const value = e.target.value
                                    if (value === info.tooltip.prefix) return
                
                                    info.tooltip.prefix = value
                                    if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                        geojson: layer.toGeoJSON(),
                                        controller,
                                    })
                                }
                            }
                        },
                        tooltipSuffix: {
                            handler: createFormFloating,
                            containerClass: 'w-10 flex-grow-1',
                            fieldAttrs: {
                                type: 'text',
                                value: info.tooltip.suffix,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Suffix',
                            labelClass: 'text-wrap',
                            events: {
                                change: (e) => {
                                    const value = e.target.value
                                    if (value === info.tooltip.suffix) return
                
                                    info.tooltip.suffix = value
                                    if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                        geojson: layer.toGeoJSON(),
                                        controller,
                                    })
                                }
                            }
                        },


                        enablePopup: {
                            handler: createFormCheck,
                            checked: info.popup.active,
                            formCheckClass: 'w-100 flex-shirnk-1 mt-2',
                            labelInnerText: 'Popup',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === info.popup.active) return
                
                                    info.popup.active = value
                                    updateLeafletGeoJSONLayer(layer, {
                                        geojson: value ? layer.toGeoJSON() : null,
                                        controller,
                                    })
                                }
                            }
                        },
                        popupProps: {
                            handler: createTagifyField,
                            inputClass: `w-75 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                            inputTag: 'textarea',
                            enabled: 0,
                            dropdownClass: `my-1 border-0`,
                            userInput: true,
                            scopeStyle: {
                                height: '58px',
                            },
                            name:  `popupProps`,
                            placeholder: 'Select properties',
                            currentValue: JSON.stringify((info.popup.properties || []).map(i => {return {value:i}})),
                            events: {
                                focus: async (e) => {
                                    const geojson = (await getLeafletGeoJSONData(layer, {
                                        controller,
                                        filter:false,
                                        queryGeom:false,
                                        group:false,
                                        sort:false,
                                        simplify:false
                                    })) || layer.toGeoJSON()
                                    if (!geojson) return
                                    
                                    const tagify = Tagify(form.elements['popupProps'])
                                    const options = []
                                    turf.propEach(geojson, (currentProperties, featureIndex) => {
                                        Object.keys(currentProperties).forEach(i => options.push(String(i)))
                                    })
                                    const optionsSet = options.length ? new Set(options) : []
                                    const sortedOptions = [...optionsSet].filter(i => {
                                        return !(info.popup.properties || []).includes(i)
                                    }).sort()
                                    tagify.settings.whitelist = sortedOptions
                                },
                            },
                            callbacks: {
                                ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                    const tagify = e.detail.tagify
                                    const values = tagify.value.map(i => i.value)
                        
                                    if (values.every(i => info.popup.properties.includes(i)) && info.popup.properties.every(i => values.includes(i)) ) return
                        
                                    info.popup.properties = values
                                    if (info.popup.active) updateLeafletGeoJSONLayer(layer, {
                                        geojson: layer.toGeoJSON(),
                                        controller,
                                    })
                                }])))()
                            }
                        },

                    },
                    className: 'flex-wrap gap-1'
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
                                    leafletLayerIsVisible(layer, {updateCache:true})
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
    
                                    leafletLayerIsVisible(layer, {updateCache:true})
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
                                    
                                    leafletLayerIsVisible(layer, {updateCache:true})
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
                            labelInnerText: 'Filter by type',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === filters.type.active) return
                
                                    Object.keys(form.elements).filter(i => i.startsWith('typeFilter-')).forEach(i => {
                                        form.elements[i].disabled = !value
                                    })

                                    filters.type.active = value
                                    updateLeafletGeoJSONLayer(layer, {
                                        geojson: value ? layer.toGeoJSON() : null,
                                        controller,
                                    })
                                }
                            }
                        },
                        toggleType: {
                            handler: createButton,
                            name: 'typeFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-toggles',
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

                                    updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })
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
                                                updateLeafletGeoJSONLayer(layer, {
                                                    controller,
                                                })
                                            }
                                        }
                                    }
                                }
                                return options
                            })()
                        },

                        enableProps: {
                            handler: createFormCheck,
                            checked: filters.properties.active,
                            formCheckClass: 'flex-grow-1',
                            labelInnerText: 'Filter by properties',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const propertyFilters = filters.properties
                                    const value = e.target.checked
                                    if (value === propertyFilters.active) return
                
                                    Object.keys(form.elements).filter(i => i.startsWith('propFilter-')).forEach(i => {
                                        form.elements[i].disabled = !value
                                    })

                                    body.querySelector(`#${filterContainerId}-prop`).querySelectorAll('.tagify').forEach(i => {
                                        value ? i.removeAttribute('disabled') : i.setAttribute('disabled', true)
                                    })

                                    propertyFilters.active = value
                                    if (Object.values(propertyFilters.values ?? {}).some(i => {
                                        return i.active && i.property && i.values.length
                                    })) updateLeafletGeoJSONLayer(layer, {
                                        geojson: value ? layer.toGeoJSON() : null,
                                        controller,
                                    })
                                }
                            }
                        },
                        operatorProps: {
                            handler: createBadgeSelect,
                            selectClass: `border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,
                            attrs: {name: 'propFilter-operator'},
                            disabled: !filters.properties.active,
                            options: {
                                '': 'Select an operator',
                                '&&': '&&',
                                '||': '||',
                            },
                            events: {
                                change:  (e) => {
                                    const propertyFilters = filters.properties

                                    let value = e.target.value
                                    if (value === '') value = e.target.value = propertyFilters.operator
                                    if (value === propertyFilters.operator) return

                                    propertyFilters.operator = value
                                    if (Object.values(propertyFilters.values ?? {}).some(i => {
                                        return i.active && i.property && i.values.length
                                    })) updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })
                                }
                            },
                            currentValue: filters.properties.operator,
                        },
                        newProp: {
                            handler: createButton,
                            name: 'propFilter-new',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-plus-lg',
                            title: 'Add a new property filter',
                            disabled: !filters.properties.active,
                            events: {
                                click: () => {
                                    const id = generateRandomString()
                                    filters.properties.values[id] = {
                                        active: true,
                                        handler: 'equals',
                                        case: true,
                                        value: true,
                                        values: [],
                                    }
                                    body.querySelector(`#${filterContainerId}-prop`).appendChild(getPropertyFilterForm(id))
                                }
                            }
                        },
                        toggleProp: {
                            handler: createButton,
                            name: 'propFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-toggles',
                            title: 'Toggle all property filters',
                            disabled: !filters.properties.active,
                            events: {
                                click: () => {
                                    const fields = Object.values(form.elements).filter(f => {
                                        return (f.getAttribute('name') || '').startsWith('propFilter-')
                                        && f.getAttribute('type') === 'checkbox'
                                    })
                                    const check = fields.every(f => !f.checked)

                                    fields.forEach(field => {
                                        field.checked = check
                                    })

                                    Object.values(filters.properties.values).forEach(f => f.active = check)

                                    updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })
                                }
                            }
                        },
                        removeProp: {
                            handler: createButton,
                            name: 'propFilter-remove',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-trash-fill',
                            title: 'Remove all property filters',
                            disabled: !filters.properties.active,
                            events: {
                                click: () => {
                                    const propertyFilters = filters.properties

                                    body.querySelector(`#${filterContainerId}-prop`).innerHTML = ''
                                    propertyFilters.values = {}
                                    if (Object.values(propertyFilters.values ?? {}).some(i => {
                                        return i.active && i.property && i.values.length
                                    })) updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })                
                                }
                            }
                        },
                        propFilter: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    id: `${filterContainerId}-prop`,
                                    className: 'd-flex flex-column w-100 gap-2',
                                    parent,
                                })  

                                for (const id in filters.properties.values) {
                                    container.appendChild(getPropertyFilterForm(id))
                                }
                            }
                        },

                        enableGeom: {
                            handler: createFormCheck,
                            checked: filters.geom.active,
                            formCheckClass: 'flex-grow-1',
                            labelInnerText: 'Filter by geometry',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === filters.geom.active) return
                
                                    Object.keys(form.elements).filter(i => i.startsWith('geomFilter-')).forEach(i => {
                                        form.elements[i].disabled = !value
                                    })

                                    filters.geom.active = value
                                    if (Object.keys(filters.geom.values || {}).length) updateLeafletGeoJSONLayer(layer, {
                                        geojson: value ? layer.toGeoJSON() : null,
                                        controller,
                                    })
                                }
                            }
                        },
                        operatorGeom: {
                            handler: createBadgeSelect,
                            selectClass: `border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,
                            attrs: {name: 'geomFilter-operator'},
                            disabled: !filters.geom.active,
                            options: {
                                '': 'Select an operator',
                                '&&': '&&',
                                '||': '||',
                            },
                            currentValue: filters.properties.operator,
                            events: {
                                change:  (e) => {
                                    let value = e.target.value
                                    if (value === '') value = e.target.value = filters.geom.operator
                                    if (value === filters.geom.operator) return

                                    filters.geom.operator = value
                                    if (Object.keys(filters.geom.values || {}).length) updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })
                                }
                            },
                        },
                        newGeom: {
                            handler: createButton,
                            name: 'geomFilter-new',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-plus-lg',
                            title: 'Add a new spatial constraint',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const id = generateRandomString()
                                    filters.geom.values[id] = {
                                        active: true,
                                        handler: 'booleanIntersects',
                                        value: true,
                                        geoms: [],
                                    }
                                    body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))
                                }
                            }
                        },
                        bboxGeom: {
                            handler: createButton,
                            name: 'geomFilter-bbox',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-bounding-box-circles',
                            title: 'Add map extent as spatial constraint',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const id = generateRandomString()
                                    filters.geom.values[id] = {
                                        active: true,
                                        handler: 'booleanIntersects',
                                        value: true,
                                        geoms: [turf.bboxPolygon(getLeafletMapBbox(map)).geometry]
                                    }
                                    body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))
                                    updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })                
                                }
                            }
                        },
                        toggleGeom: {
                            handler: createButton,
                            name: 'geomFilter-toggle',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-toggles',
                            title: 'Toggle all spatial constraints',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    const fields = Object.values(form.elements).filter(f => {
                                        if (!f.getAttribute) return
                                        return (f.getAttribute('name') || '').startsWith('geomFilter-')
                                        && f.getAttribute('type') === 'checkbox'
                                    })
                                    const check = fields.every(f => !f.checked)

                                    fields.forEach(field => {
                                        field.checked = check
                                    })

                                    Object.values(filters.geom.values).forEach(f => f.active = check)

                                    updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })
                                }
                            }
                        },
                        removeGeom: {
                            handler: createButton,
                            name: 'geomFilter-remove',
                            className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                            iconSpecs: 'bi bi-trash-fill',
                            title: 'Remove all spatial constraints',
                            disabled: !filters.geom.active,
                            events: {
                                click: () => {
                                    body.querySelector(`#${filterContainerId}-geom`).innerHTML = ''
                                    const update = Object.values(filters.geom.values).some(f => f.active && f.geoms?.length)
                                    filters.geom.values = {}
                                    if (update) updateLeafletGeoJSONLayer(layer, {
                                        controller,
                                    })                
                                }
                            }
                        },
                        geomFilter: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    id: `${filterContainerId}-geom`,
                                    className: 'd-flex flex-column w-100 gap-2',
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
            categoryCollase.id = generateRandomString()
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
            
            createIcon({
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
                section.className = `d-flex flex-column gap-2`
                categorySections.appendChild(section)

                const sectionCollase = document.createElement('div')
                sectionCollase.id = data.id ?? generateRandomString()
                sectionCollase.className = 'collapse show'
    
                const sectionHeader = document.createElement('div')
                sectionHeader.className = `d-flex fw-normal`
                sectionHeader.setAttribute('data-bs-toggle', 'collapse')
                sectionHeader.setAttribute('aria-expanded', 'true')
                sectionHeader.setAttribute('data-bs-target', `#${sectionCollase.id}`)
                sectionHeader.setAttribute('aria-controls', sectionCollase.id)
                sectionHeader.style.cursor = 'pointer'
                
                const sectionLabel = document.createElement('span')
                sectionLabel.innerText = sectionName
                sectionHeader.appendChild(sectionLabel)
                
                createIcon({
                    className:'dropdown-toggle ms-auto', 
                    parent:sectionHeader, 
                    peNone:true
                })
    
                section.appendChild(sectionHeader)
                section.appendChild(sectionCollase)
    
                const sectionFields = document.createElement('div')
                sectionFields.className = `d-flex align-items-center w-100 ${data.className}`
                sectionCollase.appendChild(sectionFields)

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
    let controller = resetController()

    const queryGroup = map._ch.getLayerGroups().query
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
        toolHandler: async (e, handler) => {
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

    const osmDataFetchers = [
        {key: 'nominatim;{}', title: 'OpenStreetMap via Nominatim',},
        {key: 'overpass;{}', title: 'OpenStreetMap via Overpass',},
    ]

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
                await dataToChecklist(osmDataFetchers, {queryGeom, abortBtns, controller})
            }
        },
        osmView: {
            iconSpecs: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            altShortcut: 'e',
            btnClickHandler: async (e, {abortBtns, controller} = {}) => {
                const queryGeom = turf.bboxPolygon(getLeafletMapBbox(map)).geometry
                await dataToChecklist(osmDataFetchers, {queryGeom, abortBtns, controller})
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