const isHiddenInLegend = (layer, map) => {
    const layerGroups = map.getLayerGroups()
    for (const layerGroupName in layerGroups) {
        const layerGroup = layerGroups[layerGroupName]
        if (layerGroup.hiddenLegendLayers.includes(layer)) {
            return layerGroup
        }
    }

    return false
}

const populateLayerDropdownMenu = (toggle, options={}) => {
    const dropdown = toggle.nextElementSibling
    if (dropdown && dropdown.innerHTML.trim() === '') {
        let map = options.map
        if (!map && options.mapSelector) {
            map = mapQuerySelector(options.mapSelector)
        }

        if (map) {
            const datasetList = toggle.closest('ul.dataset-list')
            
            let type = options.type
            if (!type) {
                if (datasetList) {
                    const toggleAll = document.querySelector(`[data-layers-toggles="#${datasetList.id}"]`)
                    if (toggleAll) {
                        type = toggleAll.getAttribute('data-layers-type')
                    }
                }
            }
            
            if (!type) {
                type = 'layer'
            }

            let bounds = options.bounds
            if (!bounds ) {
                if (options.bboxCoords) {
                    const [minX, minY, maxX, maxY] = options.bboxCoords.slice(1, -1).split(',')
                    bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
                } else if (options.layer) {
                    const layer = options.layer
                    bounds = getLayerBounds(layer)              
                }
            }
    
            if (bounds) {
                const zoomBtn = createDropdownMenuListItem({
                    label: `Zoom to ${type}`,
                    buttonClass: 'bi bi-zoom-in',
                })
                dropdown.appendChild(zoomBtn)
                zoomBtn.addEventListener('click', () => {
                    if (bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()) {
                        map.setView(bounds.getNorthEast(), 15)
                    } else {
                        map.fitBounds(bounds)
                    }
                })
            }

            const layerGroupName = options.layerGroup || 'library'
            const layerGroup = map.getLayerGroups()[layerGroupName]
            const checkbox = findOuterElement('input.form-check-input', toggle)

            if (datasetList) {
                const datasetListId = datasetList.id
                const isolateBtn = createDropdownMenuListItem({
                    label: `Isolate ${type}`,
                    buttonClass: 'bi bi-subtract',
                })
                dropdown.appendChild(isolateBtn)
                isolateBtn.addEventListener('click', () => {
                    if (datasetListId === 'legendLayers') {
                        layerGroup.eachLayer(layer => {
                            if (options.layer !== layer) {
                                layerGroup.hiddenLegendLayers.push(layer)
                                layerGroup.removeLayer(layer)
                            }
                        })
                        layerGroup.hiddenLegendLayers = layerGroup.hiddenLegendLayers.filter(layer => layer !== options.layer)
                        layerGroup.addLayer(options.layer)
                    } else {
                        if (checkbox) {
                            datasetList.querySelectorAll('input.form-check-input').forEach(input => {
                                if (input.checked && input !== checkbox) {
                                    input.click()
                                }
                            })
        
                            if (!checkbox.checked) {
                                checkbox.click()
                            }
                        }
                    }
                })

                if (datasetListId === 'legendLayers') {
                    const showHideBtn = createDropdownMenuListItem({
                        label: `Show/hide ${type}`,
                        buttonClass: 'bi bi-eye',
                    })
                    dropdown.appendChild(showHideBtn)
                    showHideBtn.addEventListener('click', () => {
                        const layer = options.layer
                        if (layer) {
                            if (layerGroup.hasLayer(layer)) {
                                layerGroup.hiddenLegendLayers.push(layer)
                                layerGroup.removeLayer(layer)
                            } else {
                                layerGroup.hiddenLegendLayers = layerGroup.hiddenLegendLayers.filter(hiddenLayer => hiddenLayer !== layer)
                                layerGroup.addLayer(layer)
                            }
                        }
                    })

                    const removeLayerBtn = createDropdownMenuListItem({
                        label: `Remove ${type}`,
                        buttonClass: 'bi bi-trash3',
                    })
                    dropdown.appendChild(removeLayerBtn)
                    removeLayerBtn.addEventListener('click', () => {
                        const layer = options.layer
                        if (layer) {
                            if (isHiddenInLegend(layer, map)) {
                                layerGroup.hiddenLegendLayers = layerGroup.hiddenLegendLayers.filter(hiddenLayer => hiddenLayer !== layer)
                                map.fire('layerremove', {layer:layer})
                            } else {
                                layerGroup.removeLayer(layer)
                            }
                        }
                    })
                }    
            }
            

            const getGeoJSON = () => {
                let geojson = options.geojson
                if (!geojson && options.layer) {
                    try {
                        geojson = options.layer.toGeoJSON()
                    } catch {}
                }

                return geojson
            }

            if (getGeoJSON()) {
                let filename = 'geojson'; 
                if (options.layer) { 
                    filename = options.layer.title || options.layer.data.layerTitle || filename;
                }
                const downloadBtn = createDropdownMenuListItem({
                    label: `Download geojson`,
                    buttonClass: 'bi bi-download',
                })
                dropdown.appendChild(downloadBtn)
                downloadBtn.addEventListener('click', () => {
                    let geojson_str = getGeoJSON()
                    if (typeof geojson_str === 'object') {
                        geojson_str = JSON.stringify(geojson_str)
                    }
        
                    downloadGeoJSON(geojson_str, filename)
                })
            }
        }
    }
}

const toggleOffAllLayers = (toggle) => {
    const targetSelector = toggle.getAttribute('data-layers-toggles')
    const target = document.querySelector(targetSelector)
    if (target) {
        const toggles = target.querySelectorAll('input[type="checkbox"]')
        toggles.forEach(toggle => {
            if (toggle.checked) {
                toggle.click()
            }
        })
    }
    toggle.setAttribute('disabled', true)
}

const toggleLayer = async (event, options={}) => {
    let map = options.map
    if (!map && options.mapSelector) {
        map = mapQuerySelector(options.mapSelector)
    }

    if (map) {
        const toggle = event.target
        
        let toggleAll
        let toggleLabel
        const datasetList = toggle.closest('ul.dataset-list')
        if (datasetList) {
            toggleAll = document.querySelector(`input[data-layers-toggles="#${datasetList.id}"]`)
            if (toggleAll) {
                toggleLabel = document.querySelector(`label[for="${toggleAll.id}"]`)
            }
        }

        let layerGroup = map.getLayerGroups()[options.layerGroup]
        if (!layerGroup) {
            layerGroup = map.getLayerGroups().library
        }
        
        const data = toggle.dataset
        const tagName = toggle.tagName.toLowerCase()
        if ((tagName === 'input' && toggle.checked) || tagName === 'button') {
            let layer = options.layer
            if (!layer && data) {
                layer = createLayerFromURL(data)
            }

            if (layer) {
                layerGroup.addLayer(layer)
                if (toggle.matches('button.add-layer-button')) {
                    updateSearchResultToggleStyle(toggle)
                } else {
                    toggle.setAttribute('data-leaflet-id', layer._leaflet_id)
                }
            }
        } else {
            const layer = layerGroup.getLayer(data.leafletId)
            if (layer) {
                layerGroup.removeLayer(layer)
            }
        }

        if (toggleAll) {
            const layersCount = Array.from(
                datasetList.querySelectorAll('input.form-check-input:not(.dataset-group)')
            ).filter(checkbox => {
                return checkbox.checked
            }).length

            if (layersCount < 1) {
                toggleAll.setAttribute('disabled', true)
                toggleAll.checked = false
                toggleLabel.innerHTML = ''
            } else {
                toggleAll.removeAttribute('disabled')
                toggleAll.checked = true

                let label = toggleAll.getAttribute('data-layers-type')
                if (!label) {
                    label = 'layer'
                }

                if (layersCount > 1) {
                    label = `${label}s`
                }

                toggleLabel.innerHTML = `showing ${layersCount} ${label}`
            }
        }
    }
}

const getLayerTitle = (layer) => {
    let title

    if (layer.feature && layer.feature.properties) {
        const properties = layer.feature.properties
        title = properties['display_name']

        if (!title) {
            title = searchByObjectPropertyKeyword(properties, 'name')
        }

        if (!title) {
            title = searchByObjectPropertyKeyword(properties, 'feature_id')
        }
        
        if (!title) {
            title = properties['type']
        }
        
        if (!title) {
            for (const key in properties) {
                const value = properties[key]
                if (typeof value === 'string' && value.length < 50) {
                    title = `${key}: ${value}`
                    return title
                }
            }
        }
    }

    return title
}

const createFeaturePropertiesTable = (properties, options={}) => {
    const table = document.createElement('table')
    table.classList.add('table', 'table-striped', 'fs-12')
    
    const header = options.header
    if (header) {
        const thead = document.createElement('thead')
        table.appendChild(thead)

        const theadtr = document.createElement('tr')
        thead.appendChild(theadtr)

        const theadth = document.createElement('th')
        theadth.setAttribute('scope', 'col')
        theadth.setAttribute('colspan', '2')
        theadth.innerText = header
        theadtr.appendChild(theadth)
    }


    const tbody = document.createElement('tbody')
    table.appendChild(tbody)

    
    const handler = (properties) => {
        Object.keys(properties).forEach(property => {
            let data = properties[property]
            
            if (data && typeof data === 'object') {
                handler(data)
            } else {
                if (!data) {data = null}

                const tr = document.createElement('tr')
                tbody.appendChild(tr)
                
                const th = document.createElement('th')
                th.innerText = property
                th.setAttribute('scope', 'row')
                tr.appendChild(th)
        
                const td = document.createElement('td')

                td.innerHTML = data
                tr.appendChild(td)
            }
        })
    }

    handler(properties)

    return table
}

const getLayerBounds = (layer) => {
    try {
        return layer.getBounds()
    } catch {
        return L.latLngBounds(layer.getLatLng(), layer.getLatLng())
    }
}

const createLayerToggles = (layer, parent, map, layerGroup, options={}) => {
    const geojson = options.geojson

    const mapContainer = map.getContainer()

    let label = layer.title || layer.data.layerTitle
    let layerCount = 0
    if (layer._layers) {
        layerCount = layer.getLayers().length
        if (layerCount > 1) {
            label = `${layer.title} (${formatNumberWithCommas(layerCount)} features)`
        }
    }

    const handler = (layer, parent, geojson, label) => {
        const formCheck = createFormCheck(`${mapContainer.id}_${layer._leaflet_id}`, {
            formCheckClass: 'fw-medium',
            checkboxClass: `bg-transparent border border-secondary box-shadow-none`,
            label: label,
            parent: parent,
        })

        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add('ms-auto', 'hstack', 'gap-2', 'align-items-start')
        formCheck.appendChild(buttonContainer)

        let type = 'feature'
        if (geojson && geojson.type === "FeatureCollection") {
            type = 'features'
        }

        const menuBtn = createInlineBtn({
            container: buttonContainer,
            buttonClass: `bi bi-three-dots text-bg-${getPreferredTheme()} show-on-hover`,
            buttonAttrs: {
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false',
            },
            buttonCallback: () => {
                populateLayerDropdownMenu(menuBtn, {
                    map: map,
                    layer: layer,
                    layerGroup: layerGroup,
                    geojson: geojson,
                    type: type
                })
            }
        })

        const dropdown = document.createElement('ul')
        dropdown.className = 'dropdown-menu fs-12'
        buttonContainer.appendChild(dropdown)

        if (layer.feature && layer.feature.properties) {
            const properties = layer.feature.properties
            if (Object.keys(properties).length > 0) {
                const collapse = document.createElement('div')
                collapse.id = `${mapContainer.id}_${layer._leaflet_id}_properties`
                collapse.className = 'collapse px-4'
                parent.appendChild(collapse)

                const table = createFeaturePropertiesTable(properties)
                collapse.appendChild(table)

                const collapseToggle = document.createElement('button')
                collapseToggle.className = 'dropdown-toggle bg-transparent border-0 px-0 show-on-hover'
                collapseToggle.setAttribute('type', 'button')
                collapseToggle.setAttribute('data-bs-toggle', 'collapse')
                collapseToggle.setAttribute('data-bs-target', `#${collapse.id}`)
                collapseToggle.setAttribute('aria-controls', collapse.id)
                collapseToggle.setAttribute('aria-expanded', `false`)
                buttonContainer.appendChild(collapseToggle)
            }
        }

        return formCheck
    }
    
    const mainToggle = handler(layer, parent, geojson, label)
    const mainCheckbox = mainToggle.querySelector('input')

    if (layerCount > 0) {
        mainCheckbox.classList.add('dataset-group')
    }

    if (layerCount > 0 && layerCount <= 100) {
        const collapse = document.createElement('div')
        collapse.id = `${mapContainer.id}_${layer._leaflet_id}_group`
        collapse.className = 'collapse show ps-3'
        parent.appendChild(collapse)

        const collapseToggle = document.createElement('button')
        collapseToggle.className = 'dropdown-toggle bg-transparent border-0 px-0 show-on-hover'
        collapseToggle.setAttribute('type', 'button')
        collapseToggle.setAttribute('data-bs-toggle', 'collapse')
        collapseToggle.setAttribute('data-bs-target', `#${collapse.id}`)
        collapseToggle.setAttribute('aria-controls', collapse.id)
        collapseToggle.setAttribute('aria-expanded', `true`)
        mainToggle.lastElementChild.appendChild(collapseToggle)

        mainCheckbox.addEventListener('click', async (event) => {
            if (mainCheckbox.checked) {
                collapse.querySelectorAll('input').forEach(checkbox => {
                    if (!checkbox.checked) {
                        checkbox.click()
                    }
                })
            } else {
                collapse.querySelectorAll('input').forEach(checkbox => {
                    if (checkbox.checked) {
                        checkbox.click()
                    }
                })
            }
        })

        map.on('layeradd', (event) => {
            if (layer.hasLayer(event.layer)) {
                if (layer.getLayers().every(feature => map.hasLayer(feature))) {
                    mainCheckbox.removeAttribute('disabled')
                    mainCheckbox.checked = true
                }
            }
        })

        map.on('layerremove', (event) => {
            if (layer.hasLayer(event.layer)) {
                mainCheckbox.checked = false
            }
        })

        layer.eachLayer(feature => {
            feature.options.popupHeader = `${layer.title}: ${feature.title}`
            const layerToggle = handler(feature, collapse, feature.feature, feature.title)
            const layerCheckbox = layerToggle.querySelector('input')
            layerCheckbox.addEventListener('click', (event) => {
                toggleLayer(event, {
                    map: map,
                    layer: feature,
                    layerGroup: layerGroup,
                })
            })    
        })

        return [mainToggle, collapse]
    } else {
        if (layerCount > 1000) {
            mainCheckbox.setAttribute('disabled',true)
        } else {
            mainCheckbox.addEventListener('click', (event) => {
                toggleLayer(event, {
                    map: map,
                    layer: layer,
                    layerGroup: layerGroup,
                })
            })    
        }

        mainToggle.classList.add('pe-3')

        return [mainToggle, undefined]
    }
}

const createWMSLayer = (data) => {
    const url = new URL(data.layerUrl)
    const baseUrl = url.origin + url.pathname
    const options = {
        layers: data.layerName, 
        format: 'image/png',
        transparent: true,
    }

    return L.tileLayer.wms(baseUrl, options)
}

const createWFSLayer = (data) => {
    const layerTitle = data.layerTitle
    const geojsonLayer = getDefaultGeoJSONLayer({
        data: data
    })
    // geojsonLayer.data = data
    geojsonLayer.data.layerLegendObj = '{}'
    geojsonLayer.options.popupHeader = layerTitle

    const defaultTooltip = `Zoom in to load individual ${layerTitle} features.`

    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })

    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('add', (event) => {
        const map = event.target._map

        const fetchData = async () => {
            if (!isHiddenInLegend(geojsonLayer, map)) {
                geojsonLayer.fire('fetchingData')
    
                let geojson = await fetchWFSData(event, geojsonLayer)
    
                let prefix
                let suffix
    
                if (geojson) {
                    const featureCount = geojson.features.length
                    const mapScale = getMeterScale(map)
                    const mapZoom = map.getZoom()
                    if (featureCount > 1000 && ((mapScale && mapScale > 10000) || (!mapScale && mapZoom < 10))) {
                        if (featureCount > 10000 || ((mapScale && mapScale > 100000) || (!mapScale && mapZoom < 6))) {
                            const feature = turf.polygonToLine(L.rectangle(L.geoJSON(geojson).getBounds()).toGeoJSON())
                            geojson.features = [feature]
                            geojson.tooltip = defaultTooltip
                            prefix = 'Bounding'
                            suffix = `for ${formatNumberWithCommas(featureCount)} features`
                        } else {
                            try {
                                geojson = turf.simplify(geojson, { tolerance: 0.01 })
                                prefix = 'Simplified'
                            } catch {
                            
                            }
                        }
                    }
                }
                
                if (!geojson) {
                    if (data.layerBbox) {
                        geojson = {
                            type: 'FeatureCollection',
                            features: [turf.polygonToLine(turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')))],
                            tooltip: defaultTooltip
                        }
        
                        prefix = 'Bounding'
                        suffix = 'for all features'
                    }
                }
    
                if (geojson) {
                    await handleGeoJSON(geojson)
    
                    geojsonLayer.clearLayers()
                    geojsonLayer.addData(geojson)
    
                    if (geojsonLayer._openPopups.length > 0) {
                        geojsonLayer._openPopups.forEach(popup => popup.openOn(map))
                        geojsonLayer._openPopups = []
                    }
    
                    let legend = {}
                    geojsonLayer.eachLayer(feature => {
                        feature.options.popupHeader = data.layerTitle
                        
                        if (geojson.tooltip) {
                            feature.bindTooltip(geojson.tooltip, {sticky:true})
                        } 
    
                        const type = feature.feature.geometry.type.replace('Multi', '')
                        
                        let label
                        if (type === 'Point') {
                            label = type
                        } else {
                            label = Array(prefix, type, suffix).filter(part => part).join(' ')
                        }
    
                        if (!Object.keys(legend).includes(label)) {
                            let style
                            if (type === 'Point') {
                                style = geojsonLayer.options.pointToLayer().options.icon
                            } else {
                                style = geojsonLayer.options.style()
                            }
    
                            legend[label] = {
                                type: type,
                                style: style,
                                count: 1,
                            }
                        } else {
                            legend[label].count += 1 
                        }
                    })
    
                    geojsonLayer.data.layerLegendObj = JSON.stringify(legend)
                    geojsonLayer.fire('legendUpdated')
                }
            }
        }

        let fetchWFSDataTimeout
        const fetchDataOnTimeout = () => {
            clearTimeout(fetchWFSDataTimeout)
            fetchWFSDataTimeout = setTimeout(fetchData, 2000)
        }

        fetchDataOnTimeout()
        map.on('moveend zoomend', fetchDataOnTimeout)
        geojsonLayer.on('remove', () => {
            map.off('moveend zoomend', fetchDataOnTimeout)
        })
    })

    return geojsonLayer
}

const createXYZTilesLayer = (data) => {
    return L.tileLayer(data.layerUrl)
}

const getCreateLayerHandler = (format) => {
    return {
        wms:createWMSLayer,
        wfs:createWFSLayer,
        xyz:createXYZTilesLayer,
    }[format]
}

const createLayerFromURL = (data) => {
    let layer

    const handler = getCreateLayerHandler(data.layerFormat)
    if (handler) {
        layer = handler(data)
    }
    
    if (layer) {
        layer.data = data

        if (data.layerBbox && !layer.hasOwnProperty('getBounds')) {
            const [minX, minY, maxX, maxY] = data.layerBbox.slice(1, -1).split(',')
            const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
            layer.getBounds = () => {
                if (bounds) {
                    return bounds
                }
            }
        }
    }
    
    return layer
}

const getLayerLoadEvents = (format) => {
    return {
        wms: {load: 'tileload', error: 'tileerror'},
        wfs: {load: 'fetched', error: 'error'},
        xyz: {load: 'tileload', error: 'tileerror'},
    }[format]
}

const assignLayerLoadEventHandlers = (layer, onload=null, onerror=null) => {
    const e = getLayerLoadEvents(layer.data.layerFormat)

    if (onload) {
        const onLoadHandler = (event) => {
            onload(event);
            layer.removeEventListener(e.load, onLoadHandler)
            if (onerror) {
                layer.removeEventListener(e.error, onerror)
            }
        }

        layer.addEventListener(e.load, onLoadHandler)
    }

    if (onerror) {
        layer.addEventListener(e.error, onerror)
    }
}

const isMultiPointLayer = (layer) => {
    return layer.feature && layer.feature.geometry.type === 'MultiPoint'
}

const isPointLayer = (layer) => {
    return layer._latlng || isMultiPointLayer(layer)
}

const getDefaultLayerStyle = (type, options={}) => {
    let color = options.color
    if (!color) {
        color = 'hsla(0, 100%, 50%, 1)'
    }

    let strokeWidth = options.strokeWidth
    let weight = options.weight

    if (!strokeWidth) {
        if (weight) {
            strokeWidth = weight
        } else {
            strokeWidth = 1
        }
    }

    if (!weight) {
        weight = strokeWidth
    }

    if (type.toLowerCase() === 'point') {
        let strokeColor = options.strokeColor
        if (!strokeColor) {
            if (color.startsWith('hsla')) {
                [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
                l = l / 2
                strokeColor = `hsla(${h}, ${s}%, ${l}%, ${a})`
            } else {
                strokeColor = 'grey'
            }
        }

        const div = document.createElement('div')
        div.className = 'h-100 w-100 rounded-circle'
        div.style.backgroundColor = color
        div.style.border = `${strokeWidth}px solid ${strokeColor}`

        return L.divIcon({
            className: 'bg-transparent',
            html: div.outerHTML,
        });
    } else {
        let opacity = options.opacity
        if (!opacity) {
            opacity = 1
        }

        const properties = {
            color: color,
            weight: weight,
            opacity: opacity
        }

        let fillColor = options.fillColor
        if (fillColor) {
            if (typeof fillColor === 'boolean') {
                if (color.startsWith('hsla')) {
                    [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
                    l = (l / 2 * 3)
                    fillColor = `hsla(${h}, ${s}%, ${l > 100 ? 100 : l}%, ${a})`
                } else {
                    fillColor = white
                }
            }

            let fillOpacity = options.fillOpacity
            if (!fillOpacity) {
                fillOpacity = 0.25
            }
                
            properties.fillOpacity = fillOpacity
            properties.fillColor = fillColor
        } else {
            properties.fillOpacity = 0
        }

        return properties
    }
}

const assignDefaultLayerStyle = (layer, options={}) => {
    let style

    if (isPointLayer(layer)) {
        style = getDefaultLayerStyle('point', options)
        if (isMultiPointLayer(layer)) {
            layer.eachLayer(i => i.setIcon(style))
        } else {
            layer.setIcon(style)
        }
    } else {
        style = getDefaultLayerStyle('other', options)
        layer.setStyle(style)
    }

    return style
}