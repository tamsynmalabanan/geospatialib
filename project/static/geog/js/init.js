const getMapDataset = (map) => {
    return map.getContainer().parentElement.dataset
}

const handleMapContainer = (map) => {
    const container = map.getContainer()
    container.classList.add('z-1')
    setAsThemedControl(container)
    container.className = `${container.className} ${getMapDataset(map).leafletMapClass}`
}

const handleMapSize = (map) => {
    let mapResizeTimeout
    const container = map.getContainer()
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target.classList.contains('leaflet-container')) {
                clearTimeout(mapResizeTimeout);
                mapResizeTimeout = setTimeout(() => {
                    map.invalidateSize()
                }, 100)
            }
        }
    });
    resizeObserver.observe(container);
}

const handleMapControls = (map) => {
    const includedControls = getMapDataset(map).leafletControlsIncluded
    const excludedControls = getMapDataset(map).leafletControlsExcluded

    const mapControls = getMapControls()
    for (let controlName in mapControls) {
        const excluded = excludedControls && (excludedControls.includes(controlName) || excludedControls === 'all')
        const included = !includedControls || includedControls.includes(controlName) || includedControls === 'all'
        mapControls[controlName](map, included && !excluded)
    }

    const container = map.getContainer()
    Array().concat(
        Array.from(container.querySelectorAll('.leaflet-bar a')),
        Array.from(container.querySelectorAll('.leaflet-bar button')),
    ).forEach(control => {
        control.classList.add(
            'btn', 
            'p-0',
            'text-reset',
            'text-decoration-none',
            'border-0',
        )

        setAsThemedControl(control)
    })

    setAsThemedControl(map.attributionControl.getContainer())
    map.getContainer().querySelectorAll('.leaflet-control-scale-line')
    .forEach(scale => setAsThemedControl(scale))

    const leafletControls = container.querySelectorAll('.leaflet-control')
    leafletControls.forEach(control => {
        Array('mouseover', 'touchstart', 'touchmove', 'wheel').forEach(trigger => {
            control.addEventListener(trigger, (e) => {
                disableMapInteractivity(map)
            })
        })    

        Array('mouseout', 'touchend').forEach(trigger => {
            control.addEventListener(trigger, (e) => {
                enableMapInteractivity(map)
            })
        })
    })
}

const handleMapContextMenu = (map) => {
    map.on('click', (event) => {
        if (event.originalEvent.target.id === map.getContainer().id) {
            console.log(event.latlng)
        }
    })
}

const handleMapBasemap = (map) => {
    L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: `leaflet-basemap leaflet-basemap-${getPreferredTheme()}`
    }).addTo(map);
}

const handleMapLayerGroups = (map) => {
    const layerGroups = {}
    Array('client', 'legend', 'query').forEach(group => {
        layerGroups[group] = L.layerGroup()
    })
    
    for (let group in layerGroups) {
        const layerGroup = layerGroups[group]
        layerGroup.hiddenLayers = []
        
        layerGroup.hide = () => map.removeLayer(layerGroup)

        layerGroup.show = () => {
            const paneName = `${group}Pane`
            const pane = map.getPane(paneName) || map.createPane(paneName)
            
            let zIndex
            if (group === 'query') {
                zIndex = 625
            }

            pane.style.zIndex = zIndex

            map.addLayer(layerGroup, {
                pane: paneName
            })
        }

        layerGroup.getBounds = () => {
            const bounds = []
            
            Array(layerGroup.getLayers(), layerGroup.hiddenLayers).forEach(set => {
                set.forEach(layer => {
                    if (layer.getBounds) {
                        bounds.push(L.rectangle(layer.getBounds()).toGeoJSON())
                    }
                })
            })

            if (bounds.length > 0) {
                return L.geoJSON(turf.featureCollection(bounds)).getBounds()
            }
        }
        
        layerGroup.hasHiddenLayer = (layer) => {
            return layerGroup.hiddenLayers.includes(layer)
        }

        layerGroup.getHiddenLayer = (leafletId) => {
            const matches = layerGroup.hiddenLayers.filter(layer => layer._leaflet_id.toString() === leafletId.toString())
            if (matches.length !== 0) {
                return matches[0]
            }
        }

        layerGroup.isolateLayer = (currentLayer) => {
            if (layerGroup.hasLayer(currentLayer) || layerGroup.hasHiddenLayer(currentLayer)) {
                layerGroup.eachLayer(layer => {
                    if (layer !== currentLayer) {
                        layerGroup.hiddenLayers.push(layer)
                        layerGroup.removeLayer(layer)
                    }
                })

                if (!layerGroup.hasLayer(currentLayer)) {
                    layerGroup.hiddenLayers = layerGroup.hiddenLayers.filter(layer => layer !== currentLayer)
                    layerGroup.addLayer(currentLayer)
                }
            }
        }

        layerGroup.toggleLayerVisibility = (layer) => {
            if (layerGroup.hasLayer(layer)) {
                layerGroup.hiddenLayers.push(layer)
                layerGroup.removeLayer(layer)
            } else {
                layerGroup.hiddenLayers = layerGroup.hiddenLayers.filter(hiddenLayer => hiddenLayer !== layer)
                layerGroup.addLayer(layer)
            }
        }

        layerGroup.customRemoveLayer = (layer) => {
            if (layerGroup.hasLayer(layer)) {
                layerGroup.removeLayer(layer)
                return
            }

            if (layerGroup.hasHiddenLayer(layer)) {
                layerGroup.hiddenLayers = layerGroup.hiddenLayers.filter(hiddenLayer => hiddenLayer !== layer)
                map.fire('layerremove', {layer:layer})
                return
            }
        }

        if (group === 'legend') {
            layerGroup.moveLayer = (currentLayer, options={}) => {
                const legend = document.querySelector(`#${map.getContainer().id}_legend`)
                const layerLegends = legend ? Array.from(legend.children) : []
                
                const layerLegend = legend?.querySelector(`[data-leaflet-id="${currentLayer._leaflet_id}"]`)
                if (!layerLegend) {return}
                const currentLayerIndex = layerLegends.indexOf(layerLegend)
                
                const index = (() => {
                    if (typeof options.index === 'number') {
                        return options.index
                    }

                    const increment = options.indexIncrement
                    if (increment) {
                        const newIndex = currentLayerIndex-increment
                        return newIndex > currentLayerIndex ? newIndex+1 : newIndex >= 0 ? newIndex : 0
                    }
                }) ()
                if (typeof index !== 'number') {return}
                console.log(index, layerLegends.length, layerLegends[index], layerLegend)
                
                if (index === -1 || index >= layerLegends.length) {
                    legend.appendChild(layerLegend)
                } else {
                    const currentIndexElement = layerLegends[index]
                    if (currentIndexElement !== layerLegend) {
                        legend.insertBefore(layerLegend, currentIndexElement)
                    }
                }

                const layerLegendsReversed = layerLegends.reverse()
                layerLegendsReversed.forEach(element => {
                    const leafletId = element.getAttribute('data-leaflet-id')
                    const layer = layerGroup.getLayer(leafletId) || layerGroup.getHiddenLayer(leafletId)
                    if (layer) {
                        const paneName = layer.options.pane
                        const pane = map.getPane(paneName)
                        if (pane) {
                            pane.style.zIndex = layerLegendsReversed.indexOf(element) + 201
                        }
                    }
                })
            }
        }

        layerGroup.show()
    }

    map.getLayerGroups = (name) => name ? layerGroups[name] : layerGroups

    map.getLayerGroup = (layer) => {
        const filteredLayerGroups = Object.values(layerGroups).filter(group => group.hasLayer(layer) || group.hasHiddenLayer(layer))
        return filteredLayerGroups.length > 0 ? filteredLayerGroups[0] : null
    }
}

const constructInfoPanel = (map, name, options={}) => {
    const mapContainer = map.getContainer()
    const mapId = mapContainer.id

    const id = `${mapId}_infoPanel${name.replace(' ', '')}`
    const toggle = createAccordionToggle(id)
    toggle.setAttribute('title', options.toggleTitle)
    mapContainer.querySelector('.info-panel-toggles').appendChild(toggle)

    setAsThemedControl(toggle)
    toggle.classList.remove('accordion-button')
    toggle.classList.add('btn', 'btn-sm', 'position-relative')
    if (!options.collapsed) {
        toggle.classList.add('pointer-bottom')
    }

    labelElement(toggle, {
        iconClass: options.iconClass,
        label: name,
        labelClass: 'd-none d-lg-inline',
    })

    toggle.addEventListener('click', () => {
        if (toggle.classList.contains('collapsed')) {
            toggle.classList.remove('pointer-bottom')
        } else {
            toggle.parentElement
            .querySelectorAll('.pointer-bottom')
            .forEach(toggle => toggle.classList.remove('pointer-bottom'))
            toggle.classList.add('pointer-bottom')
        }
    })
    
    const accordion = mapContainer.querySelector('.info-panel-accordion')
    const collapse = createAccordionCollapse(id, accordion.id, options.collapsed)
    accordion.appendChild(collapse)
    
    const header = document.createElement('h6')
    header.classList.add('p-3', 'm-0', 'fw-semibold', 'fs-16', 'd-flex', 'gap-5', 'justify-content-between')
    collapse.appendChild(header)

    const span = document.createElement('span')
    span.innerText = name
    header.appendChild(span)

    const panelMenuContainer = document.createElement('div')
    panelMenuContainer.className = 'dropdown ms-auto info-panel-menu'
    header.appendChild(panelMenuContainer)

    const panelMenuToggle = createButton({
        buttonClass: 'bi bi-list p-0 bg-transparent border-0',
        buttonAttrs: {
            'type': 'button',
            'data-bs-toggle': 'dropdown',
            'aria-expanded': 'false',
            'title': `${name} options`
        },
        labelClass: 'text-nowrap',
        parent: panelMenuContainer,
    })

    const panelMenu = document.createElement('ul')
    panelMenu.className = 'dropdown-menu fs-14 list-unstyled'
    panelMenuContainer.appendChild(panelMenu)



    const body = document.createElement('div')
    body.classList.add('accordion-body', 'd-flex', 'flex-column', 'overflow-auto', 'p-0')
    collapse.appendChild(body)

    const resizeInfoPanel = () => {
        const mapContainerHeight = mapContainer.clientHeight
        const mapContainerWidth = mapContainer.clientWidth

        const topMargin = Math.floor(body.getBoundingClientRect().top) - Math.floor(mapContainer.getBoundingClientRect().top)

        let siblingsHeight = 0
        Array.from(collapse.children).forEach(element => {
            if (element != body) {
                const height = parseInt(window.getComputedStyle(element).height)
                if (height) {
                    siblingsHeight += height
                }
            }
        })

        body.style.maxHeight = `${(mapContainerHeight * 0.9)-topMargin-siblingsHeight}px`;
        
        if (mapContainerWidth > 1000) {
            body.parentElement.style.maxWidth = `${mapContainerWidth * 0.4}px`;
        } else {
            body.parentElement.style.maxWidth = `${mapContainerWidth * 0.8}px`;
        }
    }

    let resizeInfoPanelTimeout
    const resizeInfoPanelOnTimeout = () => {
        clearTimeout(resizeInfoPanelTimeout)
        resizeInfoPanelTimeout = setTimeout(resizeInfoPanel, 200)
    }

    map.on('resize', resizeInfoPanelOnTimeout)
    toggle.addEventListener('click', resizeInfoPanel)
    observeInnerHTML(body, resizeInfoPanel)

    return body
}

const handleMapLegend = (map) => {
    const mapContainer = map.getContainer()
    const mapId = mapContainer.id
    const legendLayerGroup = map.getLayerGroups().legend

    const body = constructInfoPanel(map, 'Legend', {
        toggleTitle: 'Toggle legend panel',
        iconClass: 'bi bi-stack',
        collapsed: false,
    })

    const ul = document.createElement('ul')
    ul.id = `${mapId}_legend`
    ul.className = 'dataset-list list-group list-group-flush'
    body.appendChild(ul)

    const collapse = body.parentElement
    const dropdownContainer = collapse.querySelector('.info-panel-menu')
    const dropdownToggle = dropdownContainer.querySelector('button')
    const dropdownMenu = dropdownContainer.querySelector('.dropdown-menu')

    const zoomBtn = createDropdownMenuListItem({
        label: 'Zoom to layers', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-zoom-in fs-12',
    }).querySelector('button')
    zoomBtn.addEventListener('click', () => {
        const bounds = legendLayerGroup.getBounds()
        if (bounds) {
            map.fitBounds(bounds)
        }
    })

    const showHideBtn = createDropdownMenuListItem({
        label: 'Show/hide layers', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-eye fs-12',
    }).querySelector('button')
    showHideBtn.addEventListener('click', () => {
        if (legendLayerGroup.getLayers().length > 0) {
            legendLayerGroup.eachLayer(layer => {
                legendLayerGroup.hiddenLayers.push(layer)
                legendLayerGroup.removeLayer(layer)
            })
        } else if (legendLayerGroup.hiddenLayers.length > 0) {
            legendLayerGroup.hiddenLayers.forEach(layer => {
                legendLayerGroup.hiddenLayers = legendLayerGroup.hiddenLayers.filter(hiddenLayer => hiddenLayer !== layer)
                legendLayerGroup.addLayer(layer)
            })
        }
    })

    const removeLayersBtn = createDropdownMenuListItem({
        label: 'Remove layers', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-trash3 fs-12',
    }).querySelector('button')
    removeLayersBtn.addEventListener('click', () => {
        legendLayerGroup.clearLayers()
        legendLayerGroup.hiddenLayers = []
        ul.innerHTML = ''
    })

    const divider = document.createElement('li')
    divider.className = 'dropdown-divider'
    dropdownMenu.appendChild(divider)

    const showHiddenLegendsBtn = createDropdownMenuListItem({
        label: 'Show hidden layer legends', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-eye-slash fs-12',
    }).querySelector('button')
    showHiddenLegendsBtn.addEventListener('click', () => {
        ul.querySelectorAll('li.d-none').forEach(li => li.classList.remove('d-none'))
    })

    const collapseExpandBtn = createDropdownMenuListItem({
        label: 'Expand/collapse legend', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-chevron-expand fs-12',
    }).querySelector('button')
    collapseExpandBtn.addEventListener('click', () => toggleAllSubCollapse(collapse))

    map.on('layeradd', (event) => {
        const layer = event.layer
        if (layer.data) {
            const layerLeafletId = layer._leaflet_id
            const legendContainerId = `${mapId}Legend_${layerLeafletId}`
            
            let legendContainer = ul.querySelector(`#${legendContainerId}`)
            if (!legendContainer) {
                legendContainer = createButtonAndCollapse(
                    legendContainerId, {
                        containerTag: 'li',
                        containerClass: 'mb-3 px-3',
                        buttonClassName: 'ms-auto show-on-hover',
                    }
                )
                legendContainer.setAttribute('data-leaflet-id', layerLeafletId)
                ul.insertBefore(legendContainer, ul.firstChild)

                const legendHeader = legendContainer.firstChild
    
                const label= document.createElement('span')
                label.classList.add('me-2', 'fs-14', 'flex-grow-1')
                label.innerText = layer.data.layerTitle
                legendHeader.insertBefore(label, legendHeader.firstChild)
                
                const menuBtn = createInlineBtn({
                    buttonClass: `bi bi-three-dots text-bg-${getPreferredTheme()} show-on-hover`,
                    buttonAttrs: {
                        'data-bs-toggle': 'dropdown',
                        'aria-expanded': 'false',
                    },
                    buttonCallback: () => {
                        populateLayerDropdownMenu(menuBtn, {
                            map: map,
                            layer: layer
                        })
                    }
                })
                legendHeader.insertBefore(menuBtn, legendHeader.lastChild)
        
                const dropdown = document.createElement('ul')
                dropdown.className = 'dropdown-menu fs-12'
                legendHeader.insertBefore(dropdown, legendHeader.lastChild)

                if (layer.layerLegendStyle) {
                    const legendCollapse = legendContainer.querySelector('.collapse')

                    layer.on('fetchingData', () => {
                        if (legendLayerGroup.hasLayer(layer)) {
                            legendCollapse.innerHTML = `
                                <div class="spinner-border spinner-border-sm text-bg-${getPreferredTheme()} m-0 p-0" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            `
                        }
                    })
    
                    layer.on('legendUpdated', () => {
                        if (legendLayerGroup.hasLayer(layer)) {
                            legendCollapse.innerHTML = ''
                            const styles = layer.layerLegendStyle
                            if (typeof styles === 'object') {
                                Object.keys(styles).forEach(name => {
                                    const style = styles[name]
            
                                    const container = document.createElement('div')
                                    container.className = 'd-flex gap-2'
                                    legendCollapse.appendChild(container)
            
                                    const icon = document.createElement('div')
                                    icon.className = 'align-self-center'
                                    icon.style.height = '10px'
                                    container.appendChild(icon)
            
                                    let labelText = name
                                    if (style.count > 1) {
                                        labelText = labelText + ` (${formatNumberWithCommas(style.count)})`
                                    }
            
                                    const label = document.createElement('div')
                                    label.innerText = labelText
                                    container.appendChild(label)
            
                                    const styleDef = style.style
                                    if (style.type === 'Point') {
                                        icon.style.width = '10px'
                                        icon.innerHTML = styleDef.options.html
                                    } else {
                                        icon.style.width = '15px'
                                        
                                        let color = styleDef.color
                                        if (!color) {
                                            color = 'hsla(0, 100%, 50%, 1)'
                                        }
            
                                        const [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
                                        
                                        let opacity = styleDef.opacity
                                        if (!opacity) {
                                            opacity = 1
                                        }
                                        
                                        let weight = styleDef.weight
                                        if (!weight) {
                                            weight = 1
                                        }
                                        
                                        const box = document.createElement('div')
                                        icon.appendChild(box)
                                        box.style.border = `${weight}px solid hsla(${h}, ${s}%, ${l}%, ${opacity})`
            
                                        if (Array('LineString').includes(style.type)) {
                                            icon.style.height = '0px'
                                            box.className = 'h-0 w-100'
                                        }
                                        
                                        if (Array('Polygon', 'box').includes(style.type)) {
                                            box.className = 'h-100 w-100'
            
                                            const fillColor = styleDef.fillColor
                                            const fillOpacity = styleDef.fillOpacity
                                            
                                            if (fillColor && fillOpacity) {
                                                const [fillh,fills,filll,filla] = fillColor.split(',').map(str => parseNumberFromString(str))
                                                box.style.backgroundColor = `hsla(${fillh}, ${fills}%, ${filll}%, ${fillOpacity})`
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    })
                }
            }

            const legendCollapse = legendContainer.querySelector('.collapse')
            if (layer.data.layerLegendUrl) {
                legendCollapse.innerHTML = createImgElement(layer.data.layerLegendUrl, 'Legend not found.').outerHTML
            } else if (!layer.layerLegendStyle) {
                legendCollapse.innerHTML = ''
            }
        }
    })

    map.on('layerremove', (event) => {
        const layer = event.layer
        if (layer) {
            const id = `${mapId}Legend_${layer._leaflet_id}`
            const legend = ul.querySelector(`#${id}`)
            if (legend) {
                if (!legendLayerGroup.hasHiddenLayer(layer)) {
                    legend.remove()
    
                    if (ul.innerHTML === '') {
                        clearLegendLayers()
                    }

                    const paneName = layer.options.pane
                    const pane = map.getPane(paneName)
                    if (pane) {
                        L.DomUtil.remove(pane)
                        delete map._panes[paneName]
                        delete map._paneRenderers[paneName]
                    }
                } else {
                    const collapse = legend.querySelector(`#${id}_collapse`)
                    collapse.innerHTML = '<i class="bi bi-eye-slash"></i>'
                }
            }

        }
    })
}

const handleMapQuery = (map) => {
    const mapContainer = map.getContainer()

    const body = constructInfoPanel(map, 'Query', {
        toggleTitle: 'Toggle query panel',
        iconClass: 'bi bi-question-circle-fill',
        collapsed: true,
    })

    const footer = document.createElement('div')
    footer.className = 'border-top p-3 d-flex flex-wrap font-monospace text-muted'
    body.parentElement.appendChild(footer)

    const collapse = body.parentElement
    const dropdownContainer = collapse.querySelector('.info-panel-menu')
    const dropdownToggle = dropdownContainer.querySelector('button')
    const dropdownMenu = dropdownContainer.querySelector('.dropdown-menu')

    const layersQueryBtn = createDropdownMenuListItem({
        label: 'Query layers', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-layers fs-12',
        buttonAttrs: {
            'data-query-osm': 'false'
        }
    }).querySelector('button')

    const layersOSMQueryBtn = createDropdownMenuListItem({
        label: 'Query layers & OSM', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-globe-americas fs-12',
        buttonAttrs: {
            'data-query-osm': 'true'
        }
    }).querySelector('button')

    const queryOSMBtn = createDropdownMenuListItem({
        label: 'Query OSM in map view', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-bounding-box fs-12',
        buttonAttrs: {
            'disabled': true
        }
    }).querySelector('button')
    
    const divider = document.createElement('li')
    divider.className = 'dropdown-divider'
    dropdownMenu.appendChild(divider)

    const cancelQueryBtn = createDropdownMenuListItem({
        label: 'Cancel query', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-arrow-counterclockwise fs-12',
        buttonAttrs: {
            'disabled': true
        }
    }).querySelector('button')

    const clearQueryBtn = createDropdownMenuListItem({
        label: 'Clear query features', 
        parent: dropdownMenu,
        buttonClass: 'bi bi-trash fs-12',
        buttonAttrs: {
            'disabled': true
        }
    }).querySelector('button')

    const clearQueryResults = () => {
        map.getLayerGroups().query.clearLayers()
        body.innerHTML = ''
        clearQueryBtn.setAttribute('disabled', true)
    }

    const disableMapQuery = () => {
        map._queryEnabled = false
        enableLayerClick(map)
        mapContainer.style.cursor = ''
        if (!map._querying) {
            cancelQueryBtn.setAttribute('disabled', true)
        }
    }

    const disableQueryBtns = () => {
        if (dropdownMenu.classList.contains('show')) {
            dropdownToggle.click()
        }

        Array(queryOSMBtn, layersQueryBtn, layersOSMQueryBtn).forEach(btn => {
            btn.setAttribute('disabled', true)
        })

        if (!map._querying) {
            cancelQueryBtn.setAttribute('disabled', true)
        }
    }

    const toggleQueryButtons = () => {
        const scale = getMeterScale(map)
        if (scale <= 100000) {
            if (!map._querying) {
                Array(layersQueryBtn, layersOSMQueryBtn).forEach(btn => {
                    btn.removeAttribute('disabled')
                })
                const span = document.createElement('span')
                span.className = 'font-monospace fs-12 text-wrap'
                span.innerText = 'Query enabled.'
                footer.innerHTML = span.outerHTML
            }
        } else {
            disableMapQuery()
            disableQueryBtns()

            if (!map._querying) {
                const span = document.createElement('span')
                span.className = 'font-monospace fs-12 text-wrap'
                span.innerText = 'Zoom in to enable query.'
                footer.innerHTML = span.outerHTML
            }
        }
        
        if (scale <= 10000) {
            queryOSMBtn.removeAttribute('disabled')
        } else {
            queryOSMBtn.setAttribute('disabled', true)
        }

    }

    map.on('zoomend resize mapInitComplete', toggleQueryButtons)

    map._queryEnabled = false
    Array(layersQueryBtn, layersOSMQueryBtn).forEach(btn => {
        btn.addEventListener('click', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            
            map._queryEnabled = true
            disableLayerClick(map)
            mapContainer.style.cursor = 'pointer'
            map._queryOSM = btn.getAttribute('data-query-osm') === "true"

            cancelQueryBtn.removeAttribute('disabled')
        })
    })

    queryOSMBtn.addEventListener('click', (event) => {
        if (getMeterScale(map) <= 10000) {
            fetchQueryData(L.rectangle(map.getBounds()).toGeoJSON(), {'OpenStreetMap':{
                label: 'OpenStreetMap',
                data: fetchOSMDataInBbox(getMapBbox(map), {abortBtn:cancelQueryBtn})
            }}).then(queryResults => {
                if (queryResults && queryResults.children.length === 1) {
                    createSpanElement({
                        label: 'There are too many features within the query area. Zoom in to a smaller extent and try again.',
                        className: 'mb-3 fs-12 font-monospace',
                        parent: queryResults
                    })    
                }
            })
        } else {
            const span = document.createElement('span')
            span.className = 'font-monospace fs-12 text-wrap'
            span.innerText = 'Zoom in to query OSM in map view.'
            footer.innerHTML = span.outerHTML
        }
    })

    cancelQueryBtn.addEventListener('click', () => {
        map._queryCancelled = true
        disableMapQuery()
    })

    clearQueryBtn.addEventListener('click', () => {
        clearQueryResults()
    })

    const collectFetchers = (event) => {
        const fetchers = {}
    
        const legendLayers = map.getLayerGroups().legend.getLayers()
        if (legendLayers.length > 0) {
            legendLayers.forEach(layer => {
                const data = layer.data
                const key = `${data.layerUrl}:${data.layerFormat}:${data.layerName}`
                if (!(key in fetchers)) {
                    fetchers[key] = {
                        label: data.layerTitle,
                        data: fetchLibraryData(event, layer, {abortBtn:cancelQueryBtn}),
                    }
                }
            })
        }

        if (map._queryOSM) {
            fetchers['OpenStreetMap'] = {
                label: 'OpenStreetMap',
                data: fetchOSMData(event, {abortBtn:cancelQueryBtn}),
            }
        }

        return fetchers
    }

    const fetchQueryData = async (defaultGeoJSON, fetchers) => {
        map._queryCancelled = false
        map._querying = true

        disableMapQuery()
        disableQueryBtns()
        clearQueryResults()

        cancelQueryBtn.removeAttribute('disabled')

        footer.innerText = 'Running query...'
        
        const queryResults = document.createElement('ul')
        queryResults.className = 'dataset-list list-group list-group-flush fs-14 w-100 overflow-auto px-3'
        queryResults.id = 'queryResults'

        const toolbar = createFormCheck('queryResultsToggleAll', {
            formCheckClass: 'fs-14 ms-3 mb-3 pe-3',
            checkboxClass: `bg-transparent border border-secondary box-shadow-none`,
            checkboxAttrs: {
                'data-layers-toggles': '#queryResults',
                'data-layers-type': 'feature',
                'disabled': 'true',
                'onclick': 'toggleOffAllLayers(this)',
            },
            parent: body
        })

        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add('ms-auto', 'hstack', 'gap-2', 'align-items-start')
        toolbar.appendChild(buttonContainer)

        createInlineBtn({
            container: buttonContainer,
            buttonClass: `bi bi-chevron-expand show-on-hover text-bg-${getPreferredTheme()}`,
            buttonCallback: () => toggleAllSubCollapse(queryResults),
        })
        
        setAsThemedControl(toolbar)
        body.appendChild(queryResults)
        
        const color = 'hsla(111, 100%, 50%, 1)'
        const defaultLayer = L.geoJSON(defaultGeoJSON).getLayers()[0]
        defaultLayer.options.pane = 'queryPane'
        defaultLayer.title = `Query location`
        assignDefaultLayerStyle(defaultLayer, {color:color})
        const [coordsToggle, coordsCollapse] = createLayerToggles(
            defaultLayer, queryResults, map, 'query'
        )
        coordsToggle.classList.add('mb-3')
        coordsToggle.querySelector('input').click()

        if (Object.keys(fetchers).length > 0) {
            const handler = async (geojson, title) => {
                defaultGeom = defaultGeoJSON.geometry
                await handleGeoJSON(geojson, {
                    defaultGeom:defaultGeom,
                    sort:true,
                    featureId:true,
                })
                
                const geoJSONLayer = getDefaultGeoJSONLayer({
                    geojson: geojson,
                    color:color,
                    fillColor:true,
                    weight:2,
                    pane:'queryPane',
                    getTitleFromLayer:true,
                    bindTitleAsTooltip:true,
                })

                
                geoJSONLayer.title = title
                createLayerToggles(geoJSONLayer, queryResults, map, 'query', {
                    geojson: geojson,
                })
                
                const layerFooter = document.createElement('div')
                layerFooter.className = 'mb-3 '
                queryResults.appendChild(layerFooter)

                layerFooter.innerHTML = `<pre class='m-0 fs-12 text-wrap ps-1 font-monospace'>${geojson.licence}</pre>`
                if (geojson.note) {
                    const span = document.createElement('p')
                    span.className = 'm-0 fs-10 text-wrap ps-1 pt-1 font-monospace text-muted text-justify lh-1'
                    span.innerText = geojson.note
                    layerFooter.appendChild(span)
                }
            }

            const data = await Promise.all(Object.values(fetchers).map(value => value.data)) 
            for (let i = 0; i <= data.length-1; i++) {
                if (data[i] && data[i].features && data[i].features.length > 0) {
                    const label = Object.values(fetchers).map(value => value.label)[i]
                    await handler(data[i], label)
                }
            }
        } else {
            createSpanElement({
                label: 'No query-enabled layers shown on map.',
                className: 'mb-3 fs-12 font-monospace',
                parent: queryResults
            })
        }

        map._querying = false
        toggleQueryButtons()
        cancelQueryBtn.setAttribute('disabled', true)
        if (map._queryCancelled) {
            clearQueryResults()
            footer.innerText = 'Query cancelled.'
            return
        } else {
            clearQueryBtn.removeAttribute('disabled')
            footer.innerText = 'Query complete.'
            return queryResults
        }
    }

    map._querying = false
    map.on('click', (event) => {
        if (map._queryEnabled) {
            defaultGeoJSON = L.marker(event.latlng).toGeoJSON()
            fetchQueryData(defaultGeoJSON, collectFetchers(event))
        }
    })
}

const handleMapInfoPanels = (map) => {
    const includedPanels = getMapDataset(map).leafletInfoPanels
    if (includedPanels) {
        const mapContainer = map.getContainer()
        const mapId = mapContainer.id

        const control = L.control({position:'topright'})
        control.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'info-panel')
            container.classList.add(
                'd-flex',
                'flex-column',
                'justify-content-end',
                'gap-2',
            )
        
            const accordion = document.createElement('div')
            setAsThemedControl(accordion)
            accordion.id = `${mapId}_infoPanelAccordion`
            accordion.classList.add(
                'info-panel-accordion',
                'accordion',
                'accordion-flush',
                'rounded',
            )
            
            const toggles = document.createElement('div')
            toggles.id = `${mapId}_infoPanelToggles`
            toggles.classList.add(
                'info-panel-toggles',
                'd-flex',
                'justify-content-end',
                'gap-2',
            )

            container.appendChild(toggles)
            container.appendChild(accordion)
                
            return container
        }
    
        control.addTo(map)

        if (includedPanels.includes('legend')) {
            handleMapLegend(map)
        }
        
        if (includedPanels.includes('query')) {
            handleMapQuery(map)
        }

        map.fire('resize')
    }
}

const handleMapObservers = (map) => {
    map.on('popupopen', (event) => {
        const wrapper = event.popup._container.querySelector('.leaflet-popup-content-wrapper')
        wrapper.classList.add(`text-bg-${getPreferredTheme()}`, 'overflow-auto')
        wrapper.style.maxHeight = `${map.getSize().y * 0.5}px`
        event.popup._container.querySelector('.leaflet-popup-tip').classList.add(`bg-${getPreferredTheme()}`)
    })

    const bboxFieldsSelector = getMapDataset(map).leafletBboxFields
    if (bboxFieldsSelector) {
        const updateBboxFields = () => {
            const bboxFields = document.querySelectorAll(bboxFieldsSelector)
            if (bboxFields.length > 0) {
                let geom
                if (map._viewReset) {
                    geom = JSON.stringify(L.rectangle(map.resetviewControl.getBounds()).toGeoJSON().geometry)
                    map._viewReset = false
                } else {
                    const bounds = loopThroughCoordinates(map.getBounds(), validateCoordinates)
                    geom = JSON.stringify(L.rectangle(bounds).toGeoJSON().geometry)
                }
                bboxFields.forEach(field => {
                    field.value = geom
                })
            }
        }        

        updateBboxFields()
        
        let updateBboxFieldsTimeout
        map.on('resize moveend zoomend updateBboxFields', (event) => {
            clearTimeout(updateBboxFieldsTimeout)
            updateBboxFieldsTimeout = setTimeout(() => {
                updateBboxFields()
            }, 100)
        })
    }
}

// const handleMapTitle = (map) => {
//     const title = getMapDataset(map)['leafletMapTitle']
//     if (title) {
//         const control = L.control({position:'topleft'})
//         control.onAdd = (map) => {
//             const container = L.DomUtil.create('div', 'leaflet-map-title')
//             setAsThemedControl(container)
//             container.classList.add(
//                 'rounded',
//                 'px-3',
//                 'py-2',
//                 'bg-opacity-75',
//             )
            
//             const header = document.createElement('h4')
//             container.appendChild(header)
//             header.className = 'm-0'
//             header.innerText = title
            
//             return container
//         }

//         const container = control.addTo(map).getContainer()

//         const topLeftContainer = map._controlCorners.topleft
//         if (topLeftContainer.firstChild !== container) {
//             topLeftContainer.insertBefore(container, topLeftContainer.firstChild);
//         }
//     }
// }

const handleMapMethods = (map) => {
    map.zoomToBounds = (bounds) => {
        if (bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()) {
            map.setView(bounds.getNorthEast(), 15)
        } else {
            map.fitBounds(bounds)
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", function (event) {
        const map = event.detail.map

        handleMapMethods(map)
        handleMapBasemap(map)
        handleMapLayerGroups(map)
        handleMapContainer(map)
        handleMapSize(map)
        handleMapInfoPanels(map)
        handleMapControls(map) // needs to be after handleMapInfoPanels
        handleMapObservers(map)
        handleMapContextMenu(map)


        map.initComplete = true
        map.fire('mapInitComplete')
    })
})