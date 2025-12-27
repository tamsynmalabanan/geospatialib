

const sortGeoJSONFeatures = (geojson) => {
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
        
        const typeComparison = featureOrder.indexOf(a.geometry?.type) - featureOrder.indexOf(b.geometry?.type)
        const rankComparison = (a.metadata.groupRank ?? 0) - (b.metadata.groupRank ?? 0)

        const comparison = (
            typeComparison !== 0 ? typeComparison : 
            rankComparison !== 0 ? rankComparison : 
            (a.properties?.name ?? '').localeCompare(b.properties?.name ?? '')
        )

        return -comparison
    })

    return geojson
}

const featuresAreSimilar = (feature1, feature2) => {
    if (feature1.geometry.type !== feature2.geometry.type) return false
    if (!turf.booleanIntersects(feature1, feature2)) return false
    if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
    if (!_.isEqual(feature1.properties, feature2.properties)) return false
    return true
}

const transformGeoJSONCoordinates = async (coordinates, source, target) => {
    const source_text = `EPSG:${source}`
    if (!proj4.defs(source_text)) await fetchProj4Def(source)
        
    const target_text = `EPSG:${target}`
    if (!proj4.defs(target_text)) await fetchProj4Def(target)

    if (proj4.defs(source_text) && proj4.defs(target_text)) {
        loopThroughCoordinates(coordinates, (coords) => {
            const projectedCoord = proj4(source_text, target_text, coords.slice(0,3))
            coords[0] = projectedCoord[0]
            coords[1] = projectedCoord[1]
            if (projectedCoord.length > 2) {
                coords[3] = projectedCoord[3]
            }
        })
    }

    return coordinates
}

const createAttributionTable = (geojson) => {
    if (!geojson || geojson?.type !== 'FeatureCollection') return

    const info = {}
    Object.keys(geojson).forEach(key => {
        if (!Array('features', 'type', 'crs').includes(key)) {
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
        labelInnerText: `${geojsonLayer._params.title} (${formatNumberWithCommas(featureLayers.length)})`,
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
                labelInnerText: featureLayer._params.title,
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
    infoContainer.innerHTML = geojsonLayer._params.attribution ?? ''
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
    tableClass = '',
    parent,
} = {}) => {
    const container = customCreateElement()

    const table = document.createElement('table')
    table.className = removeWhitespace(`
        table table-sm table-striped m-0 ${tableClass}
    `)
    container.appendChild(table)

    if (header) {
        const thead = document.createElement('thead')
        table.appendChild(thead)

        const theadtr = document.createElement('tr')
        thead.appendChild(theadtr)

        const theadth = document.createElement('th')
        theadth.setAttribute('scope', 'col')
        theadth.setAttribute('colspan', '2')
        theadth.className = 'fw-bold text-break text-wrap p-0 text-start'
        theadth.style.textAlign = 'center'
        theadth.innerHTML = header
        theadth.style.maxWidth = `${window.innerWidth * 0.25}px`
        theadtr.appendChild(theadth)
    }

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    
    Object.keys(properties).forEach(property => {
        const data = properties[property] ?? null

        const tr = document.createElement('tr')
        tbody.appendChild(tr)
        
        const key = document.createElement('td')
        key.className = 'fw-medium pe-3'
        key.innerText = property
        key.setAttribute('scope', 'row')
        tr.appendChild(key)
        
        const value = document.createElement('td')
        value.style.maxWidth = `${window.innerWidth * 0.25}px`
        value.className = 'text-wrap'
        value.innerHTML = isNaN(data) ? data : formatNumberWithCommas(Number(data))
        tr.appendChild(value)
    })

    if (parent && parent instanceof Element) {
        parent.appendChild(container)
    }

    return container
}

const fetchGeoJSONHandlers = (name) => {
    return {
        osm: fetchOSMData,
        nominatim: fetchReverseNominatim,
        overpass: fetchOverpass,
        geojson: fetchGeoJSON,
        file: fetchFileData,
        kmz: fetchFileData,
        gpkg: fetchFileData,
        sqlite: fetchFileData,
        csv: fetchCSV,
        gpx: fetchGPX,
        kml: fetchKML,
        shp: fetchSHP,
        dxf: fetchDXF,
        'ogc-wms': fetchWMSData,
        'ogc-wfs': fetchWFSData,
    }[name]
}

const staticVectorFormats = [
    'local',
    'file',
    'geojson',
    'csv',
    'gpx',
    'kml',
    'shp',
    'dxf',
    'osm',
    'kmz',
    'gpkg',
    'sqlite',
]

const mapForGetGeoJSON = new Map()
const getGeoJSON = async (dbKey, {
    queryGeom, 
    zoom=20, 
    controller, 
    abortBtns,
    sort=false,
    event,
} = {}) => {
    if (!dbKey) return

    const bbox = queryGeom ? turf.bbox(queryGeom).join(',') : null
    const mapKey = [dbKey, bbox, controller?.id].join(';')

    if (mapForGetGeoJSON.has(mapKey)) {
        const data = await mapForGetGeoJSON.get(mapKey)
        if (controller?.signal.aborted) return
        return data
    }
        
    const dataPromise = (async () => {
        try {
            const [handlerName, handlerParams] = dbKey.split(';', 2)

            const isLocal = handlerName === 'local'
            const isStatic = staticVectorFormats.includes(handlerName)
            
            const queryExtent = queryGeom ? turf.getType(queryGeom).includes('Polygon') ? queryGeom : turf.buffer(
                queryGeom, leafletZoomToMeter(zoom)/2/1000
            ).geometry : null
            
            let geojson
        
            geojson = await (async () => {
                if (controller?.signal.aborted) return
                
                const cachedData = await getFromGISDB(dbKey)
                if (!cachedData) {
                    if (isLocal) {
                        return new Error('Stored data not found.')
                    } else {
                        return
                    }
                }
        
                const cachedGeoJSON = cachedData.gisData
                const cachedQueryExtent = cachedData.queryExtent

                if (queryExtent && cachedGeoJSON.features.length) {
                    if (isStatic) {
                        if (!turf.booleanIntersects(queryExtent, cachedQueryExtent)) {
                            return turf.featureCollection([])
                        }
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
                        
                        let intersects
                        
                        try {
                            intersects = turf.booleanIntersects(queryExtent, feature)
                        } catch (error) {
                            intersects = turf.booleanIntersects(queryExtent, turf.envelope(feature))
                        }

                        return intersects
                    })
                }

                return cachedGeoJSON
            })()
            
            if (!isLocal && ((isStatic && !geojson) || (!isStatic && !geojson?.features?.length))) {
                geojson = await (async () => {
                    if (controller?.signal.aborted) return
                    
                    const params = JSON.parse(handlerParams)
                    const geojson = await fetchGeoJSONHandlers(handlerName)(
                        ...Object.values(params), {
                            queryGeom,
                            zoom, 
                            controller, 
                            abortBtns,
                            event,
                        }
                    )

                    if (!geojson) return new Error('No geojson retrieved.')
                    
                    if (geojson.features?.length) {
                        if (controller?.signal.aborted) return
                        await normalizeGeoJSON(geojson, {defaultGeom:queryGeom.geometry, controller, abortBtns})

                        if (controller?.signal.aborted) return
                        if (!Array('nominatim', 'ogc-wms').includes(handlerName)) {
                            await updateGISDB(
                                dbKey, 
                                turf.clone(geojson),
                                isStatic ? turf.envelope(geojson).geometry : queryExtent,
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
                sortGeoJSONFeatures(geojson)
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
    a.click()
    URL.revokeObjectURL(url)
}

const validateGeoJSONFeature = (feature, filters) => {
    if (filters.type.active && !filters.type.values[feature.geometry.type]) return false
    
    if (filters.properties.active) {
        const operator = filters.properties.operator
        const propertyFilters = Object.values(filters.properties.values)
        .filter(i => i.active && i.property && i.values?.length)

        const evaluate = (i) => {
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

        if (operator === '&&' && !propertyFilters.every(i => evaluate(i))) return false
        if (operator === '||' && !propertyFilters.some(i => evaluate(i))) return false
    }
        
    if (filters.geom.active) {
        const operator = filters.geom.operator
        const geomFilters = Object.values(filters.geom.values)
        .filter(i => i.active && i.geoms?.length && i.geoms.every(g => turf.booleanValid(g)))
        
        const evaluate = (i) => {
            const handler = turf[i.handler]
            if (!handler) return true

            try {
                return i.geoms.some(g => handler(feature.geometry, g) === i.value)
            } catch {
                return !i.value
            }
        }

        if (operator === '&&' && !geomFilters.every(i => evaluate(i))) return false
        if (operator === '||' && !geomFilters.some(i => evaluate(i))) return false
    }

    return true
}

const csvToGeoJSON = (csv, params) => {
    const xField = params.xField?.trim()
    const yField = params.yField?.trim()
    const srid = parseInt(params.srid ?? 4326) 

    const parsedCSV = Papa.parse(csv, {header: true})
    const features = []

    for (const data of parsedCSV.data) {
        if (Object.keys(data).length !== parsedCSV.meta.fields.length) continue
        
        const lon = parseFloat(data[xField])
        const lat = parseFloat(data[yField])
        if (isNaN(lon) || isNaN(lat)) continue

        const feature = turf.point([lon, lat], data)
        features.push(feature)
    }    
    
    geojson = turf.featureCollection(features)
    if (srid !== 4326) {
        geojson.crs = {properties:{name:`EPSG::${srid}`}}
    }

    return geojson
}

const simplifyFeature = (feature, {
    maxPts,
    tolerance = 0.001,
    mutate = false,
    highQuality = false,
    maxTolerance = 1,
} = {}) => {
    try {
        maxPts = !isNaN(maxPts) ? Number(maxPts) : null

        if (maxPts && turf.coordAll(feature).length <= maxPts) {
            return feature
        }

        const type = turf.getType(feature)
        const options = {tolerance, mutate, highQuality}
        let simpleFeature = turf.simplify(feature, options)
        
        if (maxPts && (
            (type.includes('Polygon') && maxPts > 2) 
            || ((type.includes('LineString') && maxPts > 1))
        )) {
            options.tolerance += 0.001
            while (
                turf.coordAll(simpleFeature).length > maxPts 
                && options.tolerance <= maxTolerance
            ) {
                simpleFeature = turf.simplify(feature, options)
                options.tolerance += 0.001
            }
        }

        return simpleFeature
    } catch (error) {
        console.log(error)
    }
}

const osmDataToGeoJSON = (data) => {
    let parsedData
    
    try {
        parsedData = JSON.parse(data)
    } catch {
        const parser = new DOMParser()
        parsedData = parser.parseFromString(data, "text/xml")
    }

    if (!parsedData) return

    return osmtogeojson(parsedData)
}

const explodeFeature = (feature, {

}={}) => {
    
}

const featuresIntersect = (feature1, feature2) => {
    let intersects = false

    try {
        intersects = turf.booleanIntersects(feature1, feature2)
    } catch {
        try {
            intersects = turf.booleanIntersects(feature1, turf.envelope(feature2))
        } catch {
            try {
                intersects = turf.booleanIntersects(turf.envelope(feature1), feature2)
            } catch {
                intersects = turf.booleanIntersects(turf.envelope(feature1), turf.envelope(feature2))
            }
        }
    }
    
    return intersects
}