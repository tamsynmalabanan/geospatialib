const createLeafletLegendItem = (layer) => {
    const map = layer._group._map
    const layers = map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-layers`)

    const paneName = layer.options.pane
    const pane = map.getPane(paneName)
    pane.style.zIndex = (layers?.children ?? []).length + 200
    
    const container = customCreateElement({
        tag: 'div',
        id: `${layers.id}-${layer._leaflet_id}`,
        className: `d-flex flex-nowrap flex-column gap-1 mb-2 position-relative ${layer?._properties?.info?.showLegend === false ? 'd-none' : ''}`,
        attrs: {
            'data-layer-legend': "true",
            'data-layer-pane': paneName,
            'data-layer-id': layer._leaflet_id,
        }
    })
    layers.insertBefore(container, layers.firstChild)
    
    const legendTitle = customCreateElement({
        tag: 'div',
        id: `${container.id}-title`,
        className: 'd-flex flex-nowrap gap-2',
        parent: container,
        innerHTML: createSpan(layer._params.title, {className:'text-break text-wrap'}).outerHTML
    })
    
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
                    'highlight', Array(referenceLegend, container).includes(c)
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

    const toggleContainer = customCreateElement({
        tag: 'div',
        className: 'ms-auto d-flex flex-nowrap gap-2',
        parent: legendTitle
    })
    
    const legendCollapse = customCreateElement({
        tag: 'div',
        id: `${container.id}-collapse`,
        className: 'collapse show ps-3',
        parent: container
    })

    const legendDetails = customCreateElement({
        tag: 'div',
        id: `${container.id}-details`,
        className: 'd-flex',
        parent: legendCollapse
    }) 
    
    const legendAttribution = customCreateElement({
        tag: 'div',
        id: `${container.id}-attribution`,
        className: `d-flex ${layer?._properties?.info?.showAttribution != false ? '' : 'd-none'}`,
        innerHTML: layer._params.attribution ?? '',
        parent: legendCollapse
    })
    Array.from(legendAttribution.querySelectorAll('a')).forEach(a => a.setAttribute('target', '_blank'))

    const collapseToggle = createIcon({
        parent: toggleContainer,
        peNone: false,
        className: 'dropdown-toggle ms-5',
        attrs: {
            'data-bs-toggle': 'collapse',
            'data-bs-target': `#${legendCollapse.id}`,
            'aria-controls': legendCollapse.id,
            'aria-expanded': 'true',
        }
    })

    const menuToggle = createIcon({
        parent: toggleContainer,
        peNone: false,
        className: 'bi bi-three-dots',
        events: {
            'click': (e) => getLeafletLayerContextMenu(e, layer)
        }
    })

    return container
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
                layers.classList.toggle('d-none', !show)
                elements.forEach(el =>  {
                    el.classList.toggle('d-none', !show)

                    const layer = map._ch.getLegendLayer(el.dataset.layerId)
                    layer._properties.info.showLegend = show
                    map._ch.updateCachedLegendLayers({layer})
                })

                const checkbox = getStyleBody().querySelector('[name="showLegend"]')
                if (checkbox) checkbox.checked = show
            },
        },
        toggleAttribution: {
            iconSpecs: 'bi bi-c-circle',
            title: 'Toggle attributions',
            disabled: true,
            btnClickHandler: () => {
                const elements = Array.from(layers.children)
                const show = elements.some(el => el.querySelector(`#${el.id}-attribution`).classList.contains('d-none'))
                elements.forEach(el =>  {
                    el.querySelector(`#${el.id}-attribution`).classList.toggle('d-none', !show)

                    const layer = map._ch.getLegendLayer(el.dataset.layerId)
                    layer._properties.info.showAttribution = show
                    map._ch.updateCachedLegendLayers({layer})
                })

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
                localStorage.setItem(`map-bbox-${map.getContainer().id}`, JSON.stringify(newBbox))
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
            if (layer instanceof L.GeoJSON) layer.options.renderer?._container?.classList.add('d-none')
            map._ch.updateCachedLegendLayers({layer})
        } else {
            if (layerLegend) {
                layerLegend.remove()

                layers.classList.toggle('d-none', layers.innerHTML === '' || Array.from(layers.children).every(el => el.classList.contains('d-none')))
                if (layers.innerHTML === '') clearLayers(tools)
            }
            
            const styleLayerId = parseInt(getStyleBody()?.dataset.layerId ?? -1)
            if (styleLayerId === layer._leaflet_id) clearStyleBody()

            if (layer instanceof L.GeoJSON) deleteLeafletLayerFillPatterns(layer)

            map._ch.updateCachedLegendLayers({handler: (i) => delete i[layer._leaflet_id]})
        }
    })

    map.on('layeradd', (event) => {
        const layer = event.layer
        if (!map._ch.hasLegendLayer(layer)) return
        
        const isHidden = map._ch.hasHiddenLegendLayer(layer)
        const isInvisible = map._ch.hasInvisibleLegendLayer(layer)
        const isGeoJSON = layer instanceof L.GeoJSON

        let container = layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)
        if (!container) {
            container = createLeafletLegendItem(layer)
            const legendDetails = container.querySelector(`#${container.id}-details`)

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
                    createGeoJSONLayerLegend(layer, legendDetails)
                })
                
                layer.on('dataerror', () => {
                    layer.clearLayers()
                    clearLegend(container, {error: true})
                })
            }
        }

        if ((isHidden || isInvisible)) {
            map.removeLayer(layer)
        } else {
            map._ch.updateCachedLegendLayers({layer})
    
            if (!isGeoJSON) {
                const details = container.querySelector(`#${container.id}-details`)
                if (turf.booleanIntersects(
                    (map._previousBbox ?? turf.bboxPolygon(getLeafletMapBbox(map))), 
                    L.rectangle(layer.getBounds()).toGeoJSON()
                )) {
                    if (details.innerHTML === '' || details.firstChild.tagName === 'I') {
                        details.innerHTML = ''
                        if (layer._params.legend) {
                            const img = new Image()
                            img.src = layer._params.legend
                            details.appendChild(img)
                        }
                    }
                } else {
                    clearLegend(container)
                }
            }
        }

        layers.classList.toggle('d-none', layers.innerHTML === '' || Array.from(layers.children).every(el => el.classList.contains('d-none')))
        if (layers.innerHTML !== '') {
            disableStyleLayerSelect(false)
            for (const tool in tools) {
                const data = tools[tool]
                if (data.disabled) {
                    toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled = false
                }
            }        
        }
    })

    map.on('initComplete', async () => {
        await map._ch.addCachedLegendLayers()
        layers.classList.toggle('d-none', layers.innerHTML === '' || Array.from(layers.children).every(el => el.classList.contains('d-none')))
    })
}
