const isHiddenInLegend = (layer, map) => {
    const layerGroups = map.getLayerGroups()
    for (const layerGroupName in layerGroups) {
        const layerGroup = layerGroups[layerGroupName]
        if (layerGroup.hasHiddenLayer(layer)) {
            return layerGroup
        }
    }

    return false
}

const populateLayerDropdownMenu = (toggle, options={}) => {
    const dropdown = toggle.nextElementSibling
    if (!dropdown || dropdown.innerHTML.trim() !== '') {return}

    const map = options.map || mapQuerySelector(options.mapSelector)
    if (!map) {return}
    
    const currentLayer = options.layer
    if (!currentLayer) {return}

    const layerGroupName = options.layerGroup || 'legend'
    const layerGroup = map.getLayerGroups()[layerGroupName]
    if (!layerGroup) {return}
    
    const datasetList = toggle.closest('ul.dataset-list')
    const currentCheckbox = datasetList ? findOuterElement(
        'input.form-check-input', 
        toggle, 
        datasetList
    ) : null
    const type = options.type || (document.querySelector(`[data-layers-toggles="#${datasetList?.id}"]`)?.getAttribute('data-layers-type') ?? 'layer')

    const bounds = options.bounds || (options.bboxCoords ? (() => {
        const [minX, minY, maxX, maxY] = options.bboxCoords.slice(1, -1).split(',');
        return L.latLngBounds([[minY, minX], [maxY, maxX]]);
    })() : getLayerBounds(currentLayer));
    
    // Zoom to layer button
    const zoomBtn = bounds ? 
    createDropdownMenuListItem({
        label: `Zoom to ${type}`,
        buttonClass: 'bi bi-zoom-in',
        buttonClickHandler: () => map.zoomToBounds(bounds)
    }) : null

    // Isolate layer button
    const isolateBtn = createDropdownMenuListItem({
        label: `Isolate ${type}`,
        buttonClass: 'bi bi-subtract',
        buttonClickHandler: () => {
            return currentCheckbox && datasetList ? 
            isolateCheckbox(datasetList, currentCheckbox) : 
            layerGroup.isolateLayer(currentLayer)
        }
    })

    // Show or hide layer button
    const showHideBtn = !currentCheckbox ? 
    createDropdownMenuListItem({
        label: `Show/hide ${type}`,
        buttonClass: 'bi bi-eye',
        buttonClickHandler: () => layerGroup.toggleLayerVisibility(currentLayer)
    }) : null

    // Remove layer button
    const removeLayerBtn = !currentCheckbox && datasetList ? 
    createDropdownMenuListItem({
        label: `Remove ${type}`,
        buttonClass: 'bi bi-trash3',
        buttonClickHandler: () => layerGroup.customRemoveLayer(currentLayer)
    }) : null

    const duplicateBtn = !currentCheckbox ? createDropdownMenuListItem({
        label: `Duplicate ${type}`,
        buttonClass: 'bi bi-copy',
        buttonAttrs: (() => {
            const attrs = {}
            const data = currentLayer.data
            for (var key in data) { 
                if (data.hasOwnProperty(key)) {
                    attrs['data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase()] = data[key]
                }
            }
            return attrs    
        })(),
        buttonClickHandler: (this) => toggleLayer(
            {target:this}, 
            {map:map}
        )
    }) : null

    Array(
        zoomBtn,
        isolateBtn,
        showHideBtn,
        removeLayerBtn,
        createDropdownDivider(),
        duplicateBtn,
    ).forEach(btn => {if (btn) {dropdown.appendChild(btn)}})

    

    // if (layerGroupName === 'legend' && options.layer) {

    //     const hideLegendBtn = createDropdownMenuListItem({
    //         label: `Hide ${type} legend`,
    //         buttonClass: 'bi bi-eye-slash',
    //     })
    //     dropdown.appendChild(hideLegendBtn)
    //     hideLegendBtn.addEventListener('click', () => {
    //         const legend = datasetList.querySelector(`[data-leaflet-id="${options.layer._leaflet_id}"]`)
    //         if (legend) {
    //             legend.classList.add('d-none')
    //         }
    //     })
    // }
    
    // const getGeoJSON = () => {
    //     let geojson = options.geojson
    //     if (!geojson && options.layer) {
    //         try {
    //             geojson = options.layer.toGeoJSON()
    //         } catch {}
    //     }

    //     return geojson
    // }

    // if (getGeoJSON()) {
    //     let filename = 'geojson'; 
    //     if (options.layer) { 
    //         filename = options.layer.title || options.layer.data.layerTitle || filename;
    //     }
    //     const downloadBtn = createDropdownMenuListItem({
    //         label: `Download geojson`,
    //         buttonClass: 'bi bi-download',
    //     })
    //     dropdown.appendChild(downloadBtn)
    //     downloadBtn.addEventListener('click', () => {
    //         let geojson_str = getGeoJSON()
    //         if (typeof geojson_str === 'object') {
    //             geojson_str = JSON.stringify(geojson_str)
    //         }

    //         downloadGeoJSON(geojson_str, filename)
    //     })
    // }
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

        const layerGroupName = options.layerGroup || 'legend'
        const layerGroup = map.getLayerGroups()[layerGroupName]
        
        const data = toggle.dataset
        const tagName = toggle.tagName.toLowerCase()
        if ((tagName === 'input' && toggle.checked) || tagName === 'button') {
            let layer = options.layer
            if (!layer && data) {
                layer = createLayerFromURL(data)
            }

            if (layer) {
                if (layerGroupName === 'legend') {
                    const paneName = `legendLayer${getRandomString(8)}Pane`
                    const pane = map.getPane(paneName) || map.createPane(paneName)
                    pane.style.zIndex = document.querySelector('#legendLayers').children.length + 201
                    layer.options.pane = paneName
                }

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
            let layersCount = Array.from(datasetList.querySelectorAll('input.form-check-input'))
            .map(checkbox => {
                let count = 0
                if (checkbox.checked) {
                    if (checkbox.classList.contains('dataset-group')) {
                        if (checkbox.classList.contains('dataset-group-collapsed') && checkbox.hasAttribute('data-leaflet-id')) {
                            const leafletId = checkbox.getAttribute('data-leaflet-id')
                            const layer = layerGroup.getLayer(leafletId)
                            if (layer && layer.getLayers) {
                                count = layer.getLayers().length
                            }
                        }
                    } else {
                        count = 1
                    }
                }
                return count              
            })
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0)

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
                    layerGroup: layerGroup,
                    geojson: geojson,
                    type: type,
                    layer: layer,
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
        if (layerCount > 100 && layerCount <= 1000) {
            mainCheckbox.classList.add('dataset-group-collapsed')
        }
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
            feature.popupHeader = `${layer.title}: ${feature.title}`
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

const getLayersViaCacheKey = (source, cacheKey) => {
    return Object.values(source._layers).filter(layer => layer.cacheKey === cacheKey)
}

const createGeoJSONLayer = (data) => {
    const cacheKey = `${data.layerUrl}_${data.layerFormat}_${data.layerName}`

    const geojsonLayer = getDefaultGeoJSONLayer()

    const layerTitle = data.layerTitle
    geojsonLayer.data = data
    geojsonLayer.layerLegendStyle = true
    geojsonLayer.popupHeader = layerTitle
    geojsonLayer.cacheKey = cacheKey
    
    const defaultTooltip = `Zoom in to load ${layerTitle} features.`
    
    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })
    
    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('add', (event) => {
        const map = event.target._map
    
        const handler = async () => {
            if (!isHiddenInLegend(geojsonLayer, map)) {
                geojsonLayer.fire('fetchingData')
                
                const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
                const layerBounds = turf.bboxPolygon(data.layerBbox.slice(1, -1).split(','))
                const queryBounds = turf.intersect(mapBounds, layerBounds)

                let geojson

                if (queryBounds) {
                    geojson = await (async () => {
                        const cachedGeoJSONStrings = getLayersViaCacheKey(map, cacheKey)
                        .map(layer => layer.cachedGeoJSON)
                        .filter(cachedGeoJSONString => cachedGeoJSONString)                    
    
                        if (cachedGeoJSONStrings.length > 0) {
                            for (const cachedGeoJSONString of cachedGeoJSONStrings) {
                                const cachedGeoJSON = JSON.parse(cachedGeoJSONString)
                                if (cachedGeoJSON) {
                                    if (!Array('Bounding', 'Simplified').includes(cachedGeoJSON.prefix)) {
                                        const equalBounds = turf.booleanEqual(queryBounds, cachedGeoJSON.mapBounds)
                                        const withinBounds = turf.booleanWithin(queryBounds, cachedGeoJSON.mapBounds)
                                        if (equalBounds || withinBounds) {
                                            if (!geojsonLayer.cachedGeoJSON) {
                                                geojsonLayer.cachedGeoJSON = cachedGeoJSONString
                                                
                                            }
    
                                            let filterBounds = L.rectangle(map.getBounds()).toGeoJSON()
                                            const crs = getGeoJSONCRS(cachedGeoJSON)
                                            if (crs && crs !== 4326) {
                                                filterBounds = await transformFeatureGeometry(filterBounds, 4326, crs)
                                            }
                                            
                                            cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
                                                return turf.booleanIntersects(filterBounds, feature)
                                            })
                                            
                                            return cachedGeoJSON
                                        }
                                    }
                                }
                            }
                        }
    
                        return
                    })()
    
                    if (!geojson) {
                        delete geojsonLayer.cachedGeoJSON
    
                        geojson = await fetchLibraryData(event, geojsonLayer)
                        if (!geojson) {
                            geojson = {
                                type: 'FeatureCollection',
                                features: [turf.polygonToLine(layerBounds)],
                                tooltip: defaultTooltip,
                                prefix: 'Bounding',
                                suffix: 'for all features',
                            }
                        } else {
                            geojson.mapBounds = mapBounds
                            if (geojson.features.length > 0) {
                                geojson.cachedGeoJSON = JSON.stringify(geojson)
                            }
                        }
                    }
    
                    if (!geojson.processed) {
                        geojson.processed = true
        
                        const mapScale = getMeterScale(map)
                        const mapZoom = map.getZoom()    
                        const featureCount = geojson.features.length
                        
                        if (featureCount > 1000 && ((mapScale && mapScale > 10000) || (!mapScale && mapZoom < 10))) {
                            if (featureCount > 2000 || ((mapScale && mapScale > 100000) || (!mapScale && mapZoom < 6))) {
                                const boundsGeoJSON = L.rectangle(L.geoJSON(geojson).getBounds()).toGeoJSON()
                                const feature = turf.polygonToLine(boundsGeoJSON)
                                geojson.features = [feature]
                                geojson.tooltip = defaultTooltip
                                geojson.prefix = 'Bounding'
        
                                let totalMatched = 'features'
                                const numberMatched = geojson.numberMatched
                                const numberReturned = geojson.numberReturned
                                if (numberMatched && numberReturned && numberMatched !== numberReturned) {
                                    totalMatched = `returned of ${formatNumberWithCommas(numberMatched)} matched features`
                                }
        
                                geojson.suffix = `for ${formatNumberWithCommas(featureCount)} ${totalMatched}`
                            } else {
                                try {
                                    geojson = turf.simplify(geojson, { tolerance: 0.01 })
                                    geojson.prefix = 'Simplified'
                                } catch {
                                
                                }
                            }
                        }                
        
                        await handleGeoJSON(geojson)
                    }
        
                    if (!geojsonLayer.cachedGeoJSON && geojson.cachedGeoJSON) {
                        if (Array('Bounding', 'Simplified').includes(geojson.prefix)) {
                            geojsonLayer.cachedGeoJSON = geojson.cachedGeoJSON
                        } else {
                            geojsonLayer.cachedGeoJSON = JSON.stringify(geojson)
                        }
                        
                    }
                } else {
                    geojson = {
                        type: 'FeatureCollection',
                        features: [],
                    }
                }

                geojsonLayer.clearLayers()
                geojsonLayer.addData(geojson)
    
                if (geojsonLayer._openPopups.length > 0) {
                    geojsonLayer._openPopups.forEach(popup => popup.openOn(map))
                    geojsonLayer._openPopups = []
                }
    
                let legend = {}
                geojsonLayer.eachLayer(feature => {
                    feature.popupHeader = data.layerTitle
    
                    if (geojson.tooltip) {
                        feature.bindTooltip(geojson.tooltip, {sticky:true})
                    } 
    
                    let type = feature.feature.geometry.type.replace('Multi', '')
                    if (geojson.prefix === 'Bounding') {
                        type = 'box'
                    }

                    let label = type
                    if (type !== 'Point') {
                        label = Array(geojson.prefix, type, geojson.suffix).filter(part => part).join(' ')
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
    
                geojsonLayer.layerLegendStyle = legend
                geojsonLayer.fire('legendUpdated')
            }
        }
    
        let fetchWFSDataTimeout
        const handlerOnTimeout = () => {
            clearTimeout(fetchWFSDataTimeout)
            fetchWFSDataTimeout = setTimeout(handler, 1000)
        }
    
        handlerOnTimeout()
        map.on('moveend zoomend', handlerOnTimeout)
        geojsonLayer.on('remove', () => {
            map.off('moveend zoomend', handlerOnTimeout)
        })
    })

    return geojsonLayer
}

const createWFSLayer = (data) => {
    return createGeoJSONLayer(data)
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
        if (data.layerBbox) {
            const [minX, minY, maxX, maxY] = data.layerBbox.slice(1, -1).split(',')
            const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
            layer.getBounds = () => {
                return bounds
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