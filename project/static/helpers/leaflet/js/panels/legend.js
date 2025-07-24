const createLeafletLegendItem = (layer) => {
    const group = layer._group
    const map = group._map
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
        innerHTML: createSpan(layer._params.title ?? 'new layer', {className:'text-break text-wrap user-select-none'}).outerHTML
    })
    
    const layerToggle = createFormCheck({
        checked: group.hasLayer(layer),
        events: {
            click: (e) => {
                e.target.checked ?
                group._handlers.unhideLayer(layer) :
                group._handlers.hideLayer(layer)
            }
        }
    })
    legendTitle.insertBefore(layerToggle, legendTitle.firstChild)
    layer.on('add remove', (e) => {
        layerToggle.querySelector('input').checked = !group._handlers.hasHiddenLayer(layer)
    })
    
    Array('mousedown', 'touchstart').forEach(t1 => {
        legendTitle.querySelector('span').addEventListener(t1, (e1) => {
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

                    map._handlers.updateStoredLegendLayers({handler: (i) => Object.keys(zIdnexUpdate).forEach(j => i[j].zIndex = zIdnexUpdate[j])})
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

    if (layer._dbIndexedKey === map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey) {
        legendTitle.appendChild(customCreateElement({
            tag: 'i', 
            className:'bi bi-pencil-square'
        }))
    }

    const toggleContainer = customCreateElement({
        tag: 'div',
        className: 'ms-auto ps-5 d-flex flex-nowrap gap-2',
        parent: legendTitle
    })
    
    const legendCollapse = customCreateElement({
        tag: 'div',
        id: `${container.id}-collapse`,
        className: 'collapse show ps-4',
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
        className: 'dropdown-toggle onblur-fade',
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
        className: 'bi bi-three-dots onblur-fade',
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
            await map._handlers.clearLegendLayers()
            disableStyleLayerSelect()
        }
    })

    let controller = resetController()

    const tools = toolsHandler({
        zoomin: {
            iconSpecs: 'bi bi-zoom-in',
            title: 'Zoom to layers',
            disabled: true,
            btnClickHandler: async () => await map._handlers.zoomToLegendLayers(),
        },
        visibility: {
            iconSpecs: 'bi bi-eye',
            title: 'Toggle visibility',
            disabled: true,
            btnClickHandler: () => {
                layers.querySelectorAll('.form-check-input').some(i => i.checked) ?
                map._handlers.hideLegendLayers() :
                map._handlers.showLegendLayers() 
            },
        },
        divider1: {
            tag: 'div',
            className: 'vr my-2',
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

                    const layer = map._handlers.getLegendLayer(el.dataset.layerId)
                    layer._properties.info.showLegend = show
                    map._handlers.updateStoredLegendLayers({layer})
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

                    const layer = map._handlers.getLegendLayer(el.dataset.layerId)
                    layer._properties.info.showAttribution = show
                    map._handlers.updateStoredLegendLayers({layer})
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
            className: 'mx-3 ms-auto',
        },
    })

    const modalBtnsContainer = customCreateElement({
        parent:toolbar,
        className:`d-flex gap-2 flex-nowrap`,
    })

    const modalBtns = {
        addLayersModal: {
            iconSpecs: 'bi-stack',
            title: 'Add new layers',
            innerText: 'Add layers',
            className: 'btn-primary', 
        },
        exportLayersModal: {
            iconSpecs: 'bi-file-zip-fill',
            title: 'Export map layers',
            innerText: 'Export map',
            className: 'btn-warning',
        }
    }
    
    Object.keys(modalBtns).forEach(i => {
        const modalElement = document.querySelector(`#${i}`)

        modalBtnsContainer.appendChild(createButton({
            ...modalBtns[i],
            textClass: 'd-none d-xxl-inline',
            className: `${modalBtns[i].className} d-flex flex-nowrap gap-2 fs-12 badge align-items-center btn btn-sm`,
            style: {color: 'white'},
            attrs: {disabled: true},
            events: {
                'click': (e) => {
                    modalElement.querySelector('form')._leafletMap = map
        
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
                    modalInstance.show()
                }            
            }
        }))

        modalElement.addEventListener('hide.bs.modal', () => {
            delete modalElement.querySelector('form')._leafletMap
        })
    })

    const clearLegend = (layerLegend, {isInvisible=false, error=false} = {}) => {
        if (!layerLegend) return

        const legendDetails = layerLegend.querySelector(`#${layerLegend.id}-details`)
        legendDetails.innerHTML = ''
        
        if (isInvisible) {
            createIcon({
                className: 'bi-eye-slash me-1',
                parent: legendDetails,
                peNone: false,
                title: 'Beyond visible range',
            })
        }
        
        if (error) {
            createIcon({
                className: 'bi-bug me-1',
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

    const createLegendImage = (layer) => {
        const details = layers.querySelector(`#${layers.id}-${layer._leaflet_id}-details`)
        details.innerHTML = ''

        const img = new Image()
        img.src = layer._params.legend
        img.alt = layer._params.title
        img.className = 'mb-1'
        img.style.maxWidth = '100%'
        details.appendChild(img)
    }

    let timeout
    map.on('movestart zoomstart', () => {
        clearTimeout(timeout)
        controller = resetController({controller, message: 'Map moved.'})
    })
    
    map.on('moveend zoomend', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            const mapBboxId = `map-bbox-${map.getContainer().id}`
            const previousBbox = map._previousBbox ?? turf.bboxPolygon(JSON.parse(localStorage.getItem(mapBboxId) ?? '[-180,-90,180,90]'))
            
            const newBbox = turf.bboxPolygon(getLeafletMapBbox(map))
            Array.from(document.querySelectorAll(`[data-form-map-id="${map.getContainer().id}"] [data-map-bbox-field="true"]`)).forEach(i => {
                i.value = JSON.stringify(newBbox.geometry)
            })
            localStorage.setItem(mapBboxId, JSON.stringify(turf.bbox(newBbox)))
            
            const controllerId = controller.id
            const promises = []

            Array.from(layers.children).reverse().forEach(async legend => {
                if (controllerId !== controller.id) return
                
                const leafletId = parseInt(legend.dataset.layerId)
                const layer = map._handlers.getLegendLayer(leafletId)
                if (!layer) return

                const isHidden = map._handlers.hasHiddenLegendLayer(layer)
                const isInvisible = !leafletLayerIsVisible(layer)
                
                const bbox = await getLeafletLayerBbox(layer)
                const withinBbox = turf.booleanIntersects(newBbox, turf.bboxPolygon(bbox))

                if (isHidden || isInvisible || !withinBbox) {
                    if (layer instanceof L.GeoJSON) layer.options.renderer?._container?.classList.add('d-none')
                    return clearLegend(legend, {isInvisible})
                }

                if (layer instanceof L.GeoJSON) {
                    if (controllerId !== controller.id) return

                    const geojson = turf.booleanWithin(newBbox, previousBbox) && layer.getLayers().length ? layer.toGeoJSON() : null

                    promises.push(updateLeafletGeoJSONLayer(layer, {
                        geojson,
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
                    if (details.innerHTML === '' || details.firstChild.tagName === 'I') {
                        createLegendImage(layer)
                    }
                }   
            })

            Promise.all(promises).then(() => map._previousBbox = newBbox)
        }, 500)
    })

    map.on('layerremove', (event) => {
        const layer = event.layer
        if (!map._legendLayerGroups.includes(layer._group)) return

        const layerLegend = layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
        
        const isHidden = map._handlers.hasHiddenLegendLayer(layer)
        const isInvisible = map._handlers.hasInvisibleLegendLayer(layer)
        
        if ((isHidden || isInvisible)) {
            clearLegend(layerLegend, {isInvisible})
            if (layer instanceof L.GeoJSON) layer.options.renderer?._container?.classList.add('d-none')
            map._handlers.updateStoredLegendLayers({layer})
        } else {
            if (layerLegend) {
                layerLegend.remove()

                layers.classList.toggle('d-none', layers.innerHTML === '' || Array.from(layers.children).every(el => el.classList.contains('d-none')))
                if (layers.innerHTML === '') clearLayers(tools)
            }
            
            const styleLayerId = parseInt(getStyleBody()?.dataset.layerId ?? -1)
            if (styleLayerId === layer._leaflet_id) clearStyleBody()

            if (layer instanceof L.GeoJSON) deleteLeafletLayerFillPatterns(layer)

            map._handlers.updateStoredLegendLayers({handler: (i) => delete i[layer._leaflet_id]})
        }
    })

    map.on('layeradd', (event) => {
        const layer = event.layer
        if (!map._handlers.hasLegendLayer(layer)) return
        
        const isHidden = map._handlers.hasHiddenLegendLayer(layer)
        const isInvisible = map._handlers.hasInvisibleLegendLayer(layer)
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
            map._handlers.updateStoredLegendLayers({layer})
    
            if (!isGeoJSON) {
                const details = container.querySelector(`#${container.id}-details`)
                if (turf.booleanIntersects(
                    (map._previousBbox ?? turf.bboxPolygon(getLeafletMapBbox(map))), 
                    L.rectangle(layer.getBounds()).toGeoJSON()
                )) {
                    if (details.innerHTML === '' || details.firstChild.tagName === 'I') {
                        details.innerHTML = ''
                        if (layer._params.legend) {
                            createLegendImage(layer)
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
        const storedBbox = localStorage.getItem(`map-bbox-${map.getContainer().id}`)
        const hasStoredLayers = Object.keys(map._handlers.getStoredLegendLayers()).length

        if (storedBbox || hasStoredLayers) {
            const alertPromise = new Promise((resolve, reject) => {
                const alert = createModal({
                    titleText: 'Restore map state?',
                    parent: document.body,
                    show: true,
                    static: true,
                    closeBtn: false,
                    centered: true,
                    contentBody: customCreateElement({
                        className: 'p-3',
                        innerHTML: `Do you want to restore the previous map extent and layers?`
                    }),
                    footerBtns: {
                        no: createButton({
                            className: `btn-danger ms-auto`,
                            innerText: 'No',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert.remove()
                                resolve(false)
                            }},
                        }),
                        yes: createButton({
                            className: `btn-success`,
                            innerText: 'Yes',
                            attrs: {'data-bs-dismiss': 'modal'},
                            events: {click: (e) => {
                                alert.remove()
                                resolve(true)
                            }},
                        }),
                    }
                })
            })

            const restoreMap = await alertPromise
            if (restoreMap) {
                if (storedBbox) map.fitBounds(L.geoJSON(turf.bboxPolygon(JSON.parse(storedBbox))).getBounds())
            
                map._handlers.addStoredLegendLayers().then(() => {
                    layers.classList.toggle('d-none', layers.innerHTML === '' || Array.from(layers.children).every(el => el.classList.contains('d-none')))
                })
            } else {
                Object.keys(localStorage).forEach(i => {
                    if (!i.includes(map.getContainer().id)) return
                    localStorage.removeItem(i)
                })
            }
        }        
            
        Array.from(modalBtnsContainer.querySelectorAll('button')).forEach(i => i.removeAttribute('disabled'))
    })
}
