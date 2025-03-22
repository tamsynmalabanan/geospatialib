const handleGeoJSON = async (geojson, {
    controller,
    defaultGeom,
    sortFeatures = false,
} = {}) => {
    const crsInfo = geojson?.crs?.properties?.name?.split('EPSG::')
    const crs = crsInfo?.length ? parseInt(crsInfo[1]) : null
    
    for (const feature of geojson.features) {
        if (controller?.signal.aborted) return
    
        feature.geometry = feature.geometry || defaultGeom
        const geomAssigned = !feature.geometry && defaultGeom
        
        if (crs && crs !== 4326 && !geomAssigned) {
            await transformGeoJSONCoordinates(feature.geometry.coordinates, crs, 4326)        
        }
        
        if (feature.id) feature.properties.feature_id = feature.id
    }

    if (sortFeatures) sortGeoJSONFeatures(geojson)
}

const sortGeoJSONFeatures = (geojson) => {
    geojson.features.sort((a, b) => {
        const featureTypeA = a.geometry.type;
        const featureTypeB = b.geometry.type;
    
        if (featureTypeA === 'Point' && featureTypeB !== 'Point') {
            return -1;
        } else if (featureTypeB === 'Point' && featureTypeA !== 'Point') {
            return 1;
        } else if (featureTypeA === 'MultiPoint' && featureTypeB !== 'MultiPoint') {
            return -1;
        } else if (featureTypeB === 'MultiPoint' && featureTypeA !== 'MultiPoint') {
            return 1;
        } else if (featureTypeA === 'LineString' && featureTypeB !== 'LineString') {
            return -1;
        } else if (featureTypeB === 'LineString' && featureTypeA !== 'LineString') {
            return 1;
        } else if (featureTypeA === 'MultiLineString' && featureTypeB !== 'MultiLineString') {
            return -1;
        } else if (featureTypeB === 'MultiLineString' && featureTypeA !== 'MultiLineString') {
            return 1;
        } else if (featureTypeA === 'Polygon' && featureTypeB !== 'Polygon') {
            return -1;
        } else if (featureTypeB === 'Polygon' && featureTypeA !== 'Polygon') {
            return 1;
        } else if (featureTypeA === 'MultiPolygon' && featureTypeB !== 'MultiPolygon') {
            return -1;
        } else if (featureTypeB === 'MultiPolygon' && featureTypeA !== 'MultiPolygon') {
            return 1;
        } else {
            return featureTypeA.localeCompare(featureTypeB);
        }
    });
}

const transformGeoJSONCoordinates = async (coordinates, source, target) => {
    const source_text = `EPSG:${source}`
    const target_text = `EPSG:${target}`
    
    [source_text, target_text].forEach(async (crs) => {
        if (!proj4.defs(crs)) await fetchProj4Def(crs)
    })

    if (proj4.defs(source_text) && proj4.defs(target_text)) {
        loopThroughGeoJSONCoordinates(coordinates, (coords) => {
            coords[0], coords[1] = proj4(source_text, target_text, coords)
        })
    }

    return coordinates
}

const loopThroughGeoJSONCoordinates = (coordinates, handler) => {
    if (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(item => typeof item === 'number')) {
        handler(coordinates)
    } else {
        Object.values(coordinates).forEach(value => loopThroughGeoJSONCoordinates(value, handler))
    }
    return coordinates
}

const createGeoJSONChecklist = async (geojsonList, group, {
    pane,
    controller,
    customStyleParams,
    defaultGeom,
} = {}) => {
    const map = group._map
    const container = document.createElement('div')
    container.className = 'd-flex flex-column gap-2'

    for (const title in geojsonList) {
        if (controller?.signal.aborted) return
        
        const geojson = geojsonList[title]
        if (!geojson) continue

        const features = geojson.features
        if (!features?.length) continue

        const listFeatures = features.length <= 100
        const disableCheck = features.length > 1000

        handleGeoJSON(geojson, {
            controller,
            defaultGeom,
            sortFeatures: listFeatures,
        })
        
        const geojsonLayer = getLeafletGeoJSONLayer({
            pane,
            geojson,
            customStyleParams,
            title,
        })

        const geojsonContainer = document.createElement('div')
        container.appendChild(geojsonContainer)

        const parentCheck = createFormCheck({
            parent: geojsonContainer,
            labelInnerText: `${title} (${formatNumberWithCommas(features.length)})`,
        }).querySelector('input')
        geojsonLayer._checkbox = `#${parentCheck.id}`
        parentCheck.disabled = disableCheck 

        const contentCollapse = document.createElement('div')
        contentCollapse.id = generateRandomString()
        contentCollapse.className = `ps-3 collapse`
        geojsonContainer.appendChild(contentCollapse)
        
        if (listFeatures) {
            const featuresContainer = document.createElement('div')
            contentCollapse.appendChild(featuresContainer)

            for (const featureLayer of geojsonLayer.getLayers()) {
                if (controller?.signal.aborted) return
                
                const featureCheck = createFormCheck({
                    parent: featuresContainer,
                    labelInnerText: featureLayer._title,
                }).querySelector('input')
                featureLayer._checkbox = `#${featureCheck.id}`
            }
        }

        const info = {}
        Object.keys(geojson).forEach(key => {
            if (!Array('features', 'type').includes(key)) {
                info[key] = geojson[key]
            }
        })

        Array(geojsonLayer, ...geojsonLayer.getLayers()).forEach(layer => {
            if (controller?.signal.aborted) return

            const checkbox = geojsonContainer.querySelector(layer._checkbox)

            const type = layer.feature ? 'feature' : 'layer'
            const checklistContextMenuHandler = (e) => contextMenuHandler(
                e.x && e.y ? e : e.originalEvent,
                {
                    'zoomin': {
                        innerText: `Zoom to ${type}`,
                        btnCallback: () => zoomToLayer(layer, map)
                    },
                    'isolate': checkbox?.disabled ? null : {
                        innerText: `Isolate ${type}`,
                        btnCallback: () => {
                            Array.from(container.querySelectorAll('input.form-check-input')).forEach(checkbox => {
                                if (checkbox.checked) checkbox.click()
                            })

                            if (checkbox) {
                                checkbox.click()
                            } else {
                                parentCheck.checked = true
                                group.addLayer(layer)
                            }
                        }
                    },
                    'hide': e.x && e.y ? null : {
                        innerText: `Hide ${type}`,
                        btnCallback: () => {
                            if (checkbox) {
                                if (checkbox.checked) checkbox.click()
                            } else {
                                group.removeLayer(layer)
                                parentCheck.checked = geojsonLayer.getLayers().some(featureLayer => group.hasLayer(featureLayer))
                            }
                        }
                    },
                    'showProperties': !layer.feature || !Object.keys(layer.feature.properties).length ? null : {
                        innerText: `Show properties`,
                        btnCallback: () => {
                            zoomToLayer(layer, map)
                            if (checkbox && !checkbox.checked) checkbox.click()
                            layer.fire('click')
                        }
                    },
                    'divider1': !layer.feature ? null : {
                        divider: true,
                    },
                    'copyFeature': !layer.feature ? null : {
                        innerText: 'Copy feature',
                        btnCallback: () => navigator.clipboard.writeText(JSON.stringify(layer.feature))
                    },
                    'copyProperties': !layer.feature ? null : {
                        innerText: 'Copy properties',
                        btnCallback: () => navigator.clipboard.writeText(JSON.stringify(layer.feature.properties))
                    },
                    'copyGeometry': !layer.feature ? null : {
                        innerText: 'Copy geometry',
                        btnCallback: () => navigator.clipboard.writeText(JSON.stringify(layer.feature.geometry))
                    },
                    'divider2': {
                        divider: true,
                    },
                    'legend': checkbox?.disabled ? null : {
                        innerText: 'Add to legend',
                        btnCallback: () => {
                            map.getLayerGroups().client.addLayer(getLeafletGeoJSONLayer({
                                geojson: layer.feature || geojson,
                                title: layer._title,
                                attribution: Object.keys(info).map(key => `${key}: ${info[key]}`).join('\n'),
                                pane: (() => {
                                    const paneName = generateRandomString()
                                    map.getPane(paneName) || map.createPane(paneName)
                                    return paneName
                                })(),
                                // customStyleParams,
                            }))
                        }
                    },
                    'download': {
                        innerText: 'Download GeoJSON',
                        btnCallback: () => downloadGeoJSON(layer.feature || geojson, layer._title)
                    },
                }
            )
            
            if (layer.feature) layer.on('contextmenu', checklistContextMenuHandler)

            if (!checkbox) return

            checkbox.parentElement.addEventListener('contextmenu', checklistContextMenuHandler)
            checkbox.addEventListener('click', (e) => {
                const isChecked = e.target.checked
                isChecked ? group.addLayer(layer) : group.removeLayer(layer)

                if (layer.feature) {
                    Object.values(layer._eventParents).forEach(parentLayer => {
                        const checkboxSelector = parentLayer._checkbox
                        if (!checkboxSelector) return
                        
                        const checked = isChecked ? true : Array.from(
                            geojsonContainer.querySelectorAll('input.form-check-input')
                        ).filter(i => `#${i.id}` !== checkboxSelector).some(i => i.checked)
                        
                        geojsonContainer.querySelector(checkboxSelector).checked = checked
                        if (!checked) group.removeLayer(parentLayer)
                    })
                } else {
                    layer.eachLayer(featureLayer => {
                        isChecked ? group.addLayer(featureLayer) : group.removeLayer(featureLayer)
                        
                        if (!featureLayer._checkbox) return
                        geojsonContainer.querySelector(featureLayer._checkbox).checked = isChecked
                    })
                }
            })

            const toggleContainer = document.createElement('div')
            toggleContainer.className = 'ms-auto d-flex flex-nowrap gap-2'
            checkbox.parentElement.appendChild(toggleContainer)    

            if (!layer.feature && typeof layer.getLayers === 'function') {
                const contentToggle = createIcon({
                    parent: toggleContainer,
                    peNone: false,
                    className: 'dropdown-toggle'
                })
                contentToggle.style.cursor = 'pointer'
                contentToggle.setAttribute('data-bs-toggle', 'collapse')
                contentToggle.setAttribute('data-bs-target', `#${contentCollapse.id}`)
                contentToggle.setAttribute('aria-controls', contentCollapse.id)
                contentToggle.setAttribute('aria-expanded', 'false')        
            }

            const menuToggle = createIcon({
                parent: toggleContainer,
                peNone: false,
                className: 'bi bi-three-dots'
            })
            menuToggle.style.cursor = 'pointer'
            menuToggle.addEventListener('click', checklistContextMenuHandler)
        })

        if (Object.keys(info).length) {
            const infoContainer = document.createElement('div')
            contentCollapse.appendChild(infoContainer)
            
            const infoTable = document.createElement('table')
            infoTable.className = `table table-${getPreferredTheme()} small table-borderless table-sm m-0`
            infoContainer.appendChild(infoTable)
    
            const infoTBody = document.createElement('tbody')
            createObjectTRs(info, infoTBody)
            infoTable.appendChild(infoTBody)
        }
    }

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const container = document.createElement('div')
    container.className = `d-flex flex-nowrap gap-2`

    const [lng, lat] = ptFeature.geometry.coordinates
    
    const latDir = lat >= 0 ? 'N' : 'S'
    const latDD = `${Math.abs(lat).toFixed(precision)} ${latDir}`
    const latDMS = `${ddToDMS(Math.abs(lat)).toString()} ${latDir}`
    
    const lngDir = lng >= 0 ? 'E' : 'W'
    const lngDD = `${Math.abs(lng).toFixed(precision)} ${lngDir}`
    const lngDMS = `${ddToDMS(Math.abs(lng)).toString()} ${lngDir}`

    const coordsFormat = getCookie('coordsFormat') || 'DD'

    const latSpan = document.createElement('span')
    latSpan.innerText = coordsFormat === 'DD' ? latDD : latDMS
    
    const lngSpan = document.createElement('span')
    lngSpan.innerText = coordsFormat === 'DD' ? lngDD : lngDMS
    
    const copyBtn = createIcon({className:'bi bi-clipboard', peNone: false})
    copyBtn.style.cursor = 'pointer'

    const setCopyBtnTooltip = (copied=false) => titleToTooltip(copyBtn, `${copied ? 'Copied' : 'Copy'} to clipboard`)
    copyBtn.addEventListener('click', () => {
        setCopyBtnTooltip(true)
        navigator.clipboard.writeText(`${latSpan.innerText} ${lngSpan.innerText}`)
    })
    copyBtn.addEventListener('mouseout', setCopyBtnTooltip)
    setCopyBtnTooltip()

    container.appendChild(copyBtn)
    container.appendChild(latSpan)
    container.appendChild(lngSpan)

    const formatRadios = createRadios({
        'DD': {
            checked:coordsFormat === 'DD' ? true : false,
            labelAttrs: {
                'data-bs-title':'Decimal Degrees',
            },
        },
        'DMS': {
            checked:coordsFormat === 'DMS' ? true : false,
            labelAttrs: {
                'data-bs-title':'Degrees, minutes, seconds',
            },
        },
    }, {
        containerClassName: 'd-flex flex-nowrap gap-2 ms-auto'
    })
    formatRadios.querySelectorAll('.form-check').forEach(formCheck => {
        const label = formCheck.querySelector('label')
        label.setAttribute('data-bs-toggle', 'tooltip')
        new bootstrap.Tooltip(label)

        const input = formCheck.querySelector('input')
        input.addEventListener('click', () => {
            const innerText = label.innerText 

            setCookie('coordsFormat', innerText)

            if (innerText === 'DD') {
                latSpan.innerText = latDD
                lngSpan.innerText = lngDD
            }

            if (innerText === 'DMS') {
                latSpan.innerText = latDMS
                lngSpan.innerText = lngDMS
            }
        })
    })
    container.appendChild(formatRadios)

    return container
}

const createFeaturePropertiesTable = (properties, {
    header,
} = {}) => {
    const table = document.createElement('table')
    table.className = removeWhitespace(`
        table table-sm table-striped
    `)

    if (header) {
        const thead = document.createElement('thead')
        table.appendChild(thead)

        const theadtr = document.createElement('tr')
        thead.appendChild(theadtr)

        const theadth = document.createElement('th')
        theadth.setAttribute('scope', 'col')
        theadth.setAttribute('colspan', '2')
        theadth.className = 'fw-medium'
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
                if (!data) data = null

                const tr = document.createElement('tr')
                tbody.appendChild(tr)
                
                const th = document.createElement('th')
                th.className = 'fw-medium'
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

const fetchGeoJSONs = async (fetchers, {
    controller,
    abortBtns,
} = {}) => {
    const fetchedGeoJSONs = await Promise.all(Object.values(fetchers).map(fetcher => fetcher.handler(
        ...fetcher.params, {
            ...fetcher.options,
            controller,
            abortBtns
        }
    )))

    if (controller.signal.aborted) return

    const geojsons = {}
    for (let i = 0; i < fetchedGeoJSONs.length; i++) {
        geojsons[Object.keys(fetchers)[i]] = fetchedGeoJSONs[i]
    }

    return geojsons
}

const downloadGeoJSON = (geojson, fileName) => {
    const geojsonStr = typeof geojson === 'string' ? geojson : JSON.stringify(geojson)
    const blob = new Blob([geojsonStr], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}