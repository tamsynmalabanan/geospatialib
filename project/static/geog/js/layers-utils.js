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

const layerToGeoJSON = (layer) => {
    try {
        return layer.toGeoJSON()
    } catch {
        return null
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
                    pane.style.zIndex = document.querySelector(`#${map.getContainer().id}_legend`).children.length + 201
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
    const leafletId = layer._leaflet_id

    const mapContainer = map.getContainer()

    let label = layer.title || layer.data.legendLabel || layer.data.layerTitle
    let layerCount = 0
    if (layer._layers) {
        layerCount = layer.getLayers().length
        if (layerCount > 1) {
            label = `${layer.title} (${formatNumberWithCommas(layerCount)} features)`
        }
    }

    const handler = (layer, parent, geojson, label) => {
        const formCheck = createFormCheck(`${mapContainer.id}_${leafletId}`, {
            formCheckTag: 'li',
            formCheckClass: 'fw-medium',
            checkboxClass: `bg-transparent border border-secondary box-shadow-none`,
            label: label,
            parent: parent,
        })

        formCheck.setAttribute('data-leaflet-id', leafletId)

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
                    geojson: geojson,
                    type: type,
                    layer: layer,
                    layerGroup: layerGroup
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
                collapse.id = `${mapContainer.id}_${leafletId}_properties`
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
        collapse.id = `${mapContainer.id}_${leafletId}_group`
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
            feature.popupHeader = () => `${layer.title}: ${feature.title}`
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

const getLayersViaCacheKey = (source, cacheKey) => {
    return Object.values(source._layers).filter(layer => layer.cacheKey === cacheKey)
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