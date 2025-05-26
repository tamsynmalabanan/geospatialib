const normalizeGeoJSON = async (geojson, {
    controller,
    defaultGeom,
} = {}) => {
    if (!geojson) return

    let crs
    if (geojson.crs) {
        const crsInfo = geojson.crs.properties?.name?.split('EPSG::')
        crs = crsInfo?.length ? parseInt(crsInfo[1]) : null
        delete geojson.crs   
    }
    
    for (const feature of geojson.features) {
        if (controller?.signal.aborted) return
        await normalizeGeoJSONFeature(feature, {
            defaultGeom,
            crs,
        })
    }
}

const normalizeGeoJSONFeature = async (feature, {
    defaultGeom,
    crs
}={}) => {
    const featureGeom = feature.geometry
    const geomAssigned = !featureGeom && defaultGeom
    feature.geometry = featureGeom || defaultGeom
    
    if (crs && crs !== 4326 && !geomAssigned) {
        await transformGeoJSONCoordinates(feature.geometry.coordinates, crs, 4326)     
    }
    
    if (feature.id) feature.properties.feature_id = feature.id
    feature.properties = normalizeFeatureProperties(feature.properties)    
}

const normalizeFeatureProperties = (properties) => {
    const normalProperties = {}
        
    const handler = (properties) => {
        Object.keys(properties).forEach(property => {
            const value = properties[property]
            if (value && typeof value === 'object') {
                handler(value)
            } else {
                normalProperties[property] = value
            }
        })
    }

    handler(properties)    

    return normalProperties
}

const sortGeoJSONFeatures = (geojson, { reverse = false } = {}) => {
    if (!geojson?.features?.length) return
    
    geojson.features.sort((a, b) => {
        const featureOrder = [
            "Point",
            "MultiPoint",
            "LineString",
            "MultiLineString",
            "Polygon",
            "MultiPolygon",
        ]
        const typeComparison = featureOrder.indexOf(a.geometry.type) - featureOrder.indexOf(b.geometry.type)
        const rankComparison = (a.properties.__groupRank__ ?? 0) - (b.properties.__groupRank__ ?? 0)

        const comparison = (
            typeComparison !== 0 ? typeComparison : 
            rankComparison !== 0 ? rankComparison : 
            (a.properties?.name ?? '').localeCompare(b.properties?.name ?? '')
        )

        return reverse ? -comparison : comparison
    })
}

const transformGeoJSONCoordinates = async (coordinates, source, target) => {
    const source_text = `EPSG:${source}`
    if (!proj4.defs(source_text)) await fetchProj4Def(source)
        
    const target_text = `EPSG:${target}`
    if (!proj4.defs(target_text)) await fetchProj4Def(target)

    if (proj4.defs(source_text) && proj4.defs(target_text)) {
        loopThroughCoordinates(coordinates, (coords) => {
            const projectedCoord = proj4(source_text, target_text, [coords[0], coords[1]])
            coords[0] = projectedCoord[0]
            coords[1] = projectedCoord[1]
        })
    }

    return coordinates
}

const createAttributionTable = (geojson) => {
    if (!geojson || geojson?.type !== 'FeatureCollection') return

    const info = {}
    Object.keys(geojson).forEach(key => {
        if (!Array('features', 'type').includes(key)) {
            info[key] = geojson[key]
        }
    })

    if (Object.keys(info).length) {
        const infoTable = document.createElement('table')
        infoTable.className = `table small table-borderless table-sm m-0`

        const infoTBody = document.createElement('tbody')
        createObjectTRs(info, infoTBody)
        infoTable.appendChild(infoTBody)

        return infoTable
    }
}

const createGeoJSONChecklist = (geojsonLayer, {
    controller,
} = {}) => {
    const featureLayers = geojsonLayer.getLayers()
    if (!featureLayers.length) return

    const group = geojsonLayer._group

    const listFeatures = featureLayers.length <= 100
    const disableCheck = featureLayers.length > 1000

    const container = document.createElement('div')

    const pCheckbox = geojsonLayer._checkbox = createFormCheck({
        parent: container,
        labelInnerText: `${geojsonLayer._title} (${formatNumberWithCommas(featureLayers.length)})`,
        labelClass: 'text-break',
        formCheckClass: `d-flex gap-2 `,
        disabled: disableCheck,
    }).querySelector('input')

    const contentCollapse = document.createElement('div')
    contentCollapse.id = generateRandomString()
    contentCollapse.className = `ps-3 collapse`
    container.appendChild(contentCollapse)
    
    if (listFeatures) {
        const featuresContainer = document.createElement('div')
        contentCollapse.appendChild(featuresContainer)

        for (const featureLayer of featureLayers.reverse()) {
            if (controller?.signal.aborted) return
            
            featureLayer._checkbox = createFormCheck({
                parent: featuresContainer,
                labelInnerText: featureLayer._title,
                labelClass: 'text-break',
                formCheckClass: `d-flex gap-2 `,
            }).querySelector('input')
        }
    }

    try {
        for (const layer of Array(geojsonLayer, ...featureLayers)) {
            if (controller?.signal.aborted) return
    
            const checkbox = layer._checkbox
            
            layer.on('add remove', (e) => {
                const added = e.type === 'add'
                if (checkbox) {
                    if (checkbox.checked === added || pCheckbox.checked === added) {
                        checkbox.checked = added
                    } else {
                        checkbox.click()
                    }
                } else {
                    pCheckbox.checked = added || Array.from(
                        container.querySelectorAll('input.form-check-input')
                    ).filter(i => i !== pCheckbox).some(i => i.checked)
                }
            })

            if (!checkbox) continue
    
            checkbox._leafletLayer = layer

            const feature = layer.feature


            checkbox.addEventListener('click', (e) => {
                const isChecked = e.target.checked
                isChecked ? group.addLayer(layer) : group.removeLayer(layer)
                
                if (feature) {
                    pCheckbox.checked = isChecked ? true : Array.from(
                        container.querySelectorAll('input.form-check-input')
                    ).filter(i => i !== pCheckbox).some(i => i.checked)
                    if (!pCheckbox.checked) group.removeLayer(geojsonLayer)
                } else {
                    layer.eachLayer(f => isChecked ? group.addLayer(f) : group.removeLayer(f))
                }
            })
    
            const toggleContainer = document.createElement('div')
            toggleContainer.className = 'ms-auto d-flex flex-nowrap gap-2'
            checkbox.parentElement.appendChild(toggleContainer)    
    
            if (!feature && typeof layer.getLayers === 'function') {
                const contentToggle = createIcon({
                    parent: toggleContainer,
                    peNone: false,
                    className: 'dropdown-toggle ms-5'
                })
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
            menuToggle.addEventListener('click', (e) => {
                getLeafletLayerContextMenu(e, layer)
            })
        }
    } catch {
        return
    }

    const infoContainer = document.createElement('div')
    infoContainer.className = 'd-flex'
    infoContainer.innerHTML = geojsonLayer._attribution || ''
    contentCollapse.appendChild(infoContainer)

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

    const formatRadios = createCheckboxOptions({
        options: {
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
        },
        type: 'radio',
        containerClass: 'ms-auto flex-nowrap gap-2',
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
        theadth.className = 'fw-medium text-break text-wrap'
        theadth.innerText = header
        theadtr.appendChild(theadth)
    }

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    
    Object.keys(properties).forEach(property => {
        if (property.startsWith('__') && property.endsWith('__')) return
        
        const data = properties[property] ?? null

        const tr = document.createElement('tr')
        tbody.appendChild(tr)
        
        const th = document.createElement('th')
        th.className = 'fw-medium pe-3'
        th.innerText = property
        th.setAttribute('scope', 'row')
        tr.appendChild(th)
        
        const td = document.createElement('td')
        td.className = 'text-wrap'
        td.innerHTML = data
        tr.appendChild(td)
    })

    return table
}

const fetchGeoJSONHandlers = (name) => {
    return {
        nominatim: fetchNominatim,
        overpass: fetchOverpass,
        geojson: fetchGeoJSON,
        file: fetchFileData,
        csv: fetchCSV,
    }[name]
}

const staticFormats = [
    'client',
    'file',
    'geojson',
    'csv',
]

const mapForGetGeoJSON = new Map()
const getGeoJSON = async (dbKey, {
    queryGeom, 
    zoom=20, 
    controller, 
    abortBtns,
    sort=false,
} = {}) => {
    if (!dbKey) return

    const mapKey = [
        dbKey, 
        (queryGeom ? turf.bbox(queryGeom).join(',') : null), 
        controller?.id
    ].join(';')

    if (mapForGetGeoJSON.has(mapKey)) {
        const data = await mapForGetGeoJSON.get(mapKey)
        if (controller?.signal.aborted) return
        return data
    }
        
    const dataPromise = (async () => {
        try {
            const [handlerName, handlerParams] = dbKey.split(';', 2)
            const isClient = handlerName === 'client'
            const isStatic = staticFormats.includes(handlerName)
            
            const queryExtent = queryGeom ? turf.getType(queryGeom) === 'Point' ? turf.buffer(
                queryGeom, leafletZoomToMeter(zoom)/2/1000
            ).geometry : queryGeom : null
            
            let geojson
        
            geojson = await (async () => {
                if (controller?.signal.aborted) return
                
                const cachedData = await getFromGeoJSONDB(dbKey)
                if (!cachedData) {
                    if (isClient) {
                        return new Error('Cached data not found.')
                    } else {
                        return
                    }
                }
        
                const cachedGeoJSON = cachedData.geojson
                const cachedQueryExtent = cachedData.queryExtent
        
                if (queryExtent && cachedGeoJSON.features.length) {
                    if (isStatic) {
                        if (!turf.booleanIntersects(queryExtent, cachedQueryExtent)) return turf.featureCollection([])
                    } else {
                        try {
                            const equalBounds = turf.booleanEqual(queryExtent, cachedQueryExtent)
                            const withinBounds = turf.booleanWithin(queryExtent, cachedQueryExtent)
                            if (!equalBounds && !withinBounds) return
                        } catch (error) {
                            return
                        }
                    }
        
                    cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
                        if (controller?.signal?.aborted) return
                        return turf.booleanIntersects(queryExtent, feature)
                    })
                }
                
                return cachedGeoJSON
            })()
            
            if (!isClient && ((isStatic && !geojson) || (!isStatic && !geojson?.features?.length))) {
                geojson = await (async () => {
                    if (controller?.signal.aborted) return
                    const geojson = await fetchGeoJSONHandlers(handlerName)(
                        ...Object.values(JSON.parse(handlerParams)), {
                            queryGeom,
                            zoom, 
                            controller, 
                            abortBtns,
                        }
                    )

                    if (!geojson) return new Error('No geojson retrieved.')
                    
                    if (geojson.features?.length) {
                        if (controller?.signal.aborted) return
                        await normalizeGeoJSON(geojson, {queryGeom, controller, abortBtns})
                        
                        if (controller?.signal.aborted) return
                        if (handlerName !== 'nominatim') {
                            await updateGeoJSONOnDB(
                                dbKey, 
                                turf.clone(geojson),
                                isStatic ? turf.bboxPolygon(turf.bbox(geojson)).geometry : queryExtent,
                            )
                        }
                        
                        if (isStatic) {
                            geojson.features = geojson.features.filter(feature => {
                                if (controller?.signal?.aborted) return
                                return turf.booleanIntersects(queryExtent, feature)
                            })
                        }
                    }
            
                    return geojson
                })()
            }

            if (geojson?.features?.length && sort) {
                sortGeoJSONFeatures(geojson, {reverse:true})
            }

            return geojson
        } catch (error) {
            return error
        } finally {
            setTimeout(() => mapForGetGeoJSON.delete(mapKey), 1000);
        }
    })()

    mapForGetGeoJSON.set(mapKey, dataPromise)
    const data = await dataPromise
    if (controller?.signal.aborted) return
    return data
}

const downloadGeoJSON = (geojson, fileName) => {
    if (!geojson) return 
    
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

const validateGeoJSONFeature = (feature, filters) => {
    if (filters.type.active && !filters.type.values[feature.geometry.type]) return false
    
    if (filters.properties.active) {
        const operator = filters.properties.operator
        const propertyFilters = Object.values(filters.properties.values)
        .filter(i => i.active && i.property && i.values?.length)

        const eval = (i) => {
            const handler = relationHandlers(i.handler)
            if (!handler) return true

            const value = (() => {
                const value = removeWhitespace(String(feature.properties[i.property] ?? '[undefined]'))
                return value === '' ? '[blank]' : value
            })()
            
            try {
                return i.values.some(v => handler(value, v, {caseSensitive:i.case}) === i.value)
            } catch (error) {
                return !i.value
            }
        }

        if (operator === '&&' && !propertyFilters.every(i => eval(i))) return false
        if (operator === '||' && !propertyFilters.some(i => eval(i))) return false
    }
        
    if (filters.geom.active) {
        const operator = filters.geom.operator
        const geomFilters = Object.values(filters.geom.values)
        .filter(i => i.active && i.geoms?.length && i.geoms.every(g => turf.booleanValid(g)))
        
        const eval = (i) => {
            const handler = turf[i.handler]
            if (!handler) return true

            try {
                return i.geoms.some(g => handler(feature.geometry, g) === i.value)
            } catch {
                return !i.value
            }
        }

        if (operator === '&&' && !geomFilters.every(i => eval(i))) return false
        if (operator === '||' && !geomFilters.some(i => eval(i))) return false
    }

    return true
}

const csvToGeoJSON = (csv, xField, yField, crs=4326, {
    xDefault=0,
    yDefault=0,
}={}) => {
    xField = xField.trim()
    yField = yField.trim()

    const parsedCSV = Papa.parse(csv, {header: true})
    const features = []

    for (const data of parsedCSV.data) {
        if (Object.keys(data).length !== parsedCSV.meta.fields.length) continue
        
        const lon = parseFloat(data[xField])
        const lat = parseFloat(data[yField])
        
        const feature = turf.point([
            !isNaN(lon) ? lon : xDefault, 
            !isNaN(lat) ? lat : yDefault, 
        ], data)

        features.push(feature)
    }    
    
    geojson = turf.featureCollection(features)
    if (!isNaN(parseInt(crs)) && parseInt(crs) !== 4326) {
        geojson.crs = {properties:{name:`EPSG::${parseInt(crs)}`}}
    }

    return geojson
}