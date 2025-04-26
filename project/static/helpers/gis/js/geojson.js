const handleGeoJSON = async (geojson, {
    controller,
    defaultGeom,
} = {}) => {
    const crsInfo = geojson?.crs?.properties?.name?.split('EPSG::')
    const crs = crsInfo?.length ? parseInt(crsInfo[1]) : null
    
    for (const feature of geojson.features) {
        if (controller?.signal.aborted) return
    
        feature.geometry = feature.geometry || defaultGeom
        const geomAssigned = !feature.geometry && defaultGeom
        
        if (crs && crs !== 4326 && !geomAssigned) {
            await transformGeoJSONCoordinates(feature.geometry.coordinates, crs, 4326)     
            delete geojson.crs   
        }
        
        if (feature.id) feature.properties.feature_id = feature.id
    }
}

const sortGeoJSONFeaturesByType = (geojson, { reverse = false }={}) => {
    geojson.features.sort((a, b) => {
        const featureTypeA = a.geometry.type;
        const featureTypeB = b.geometry.type;

        const featureOrder = [
            "Point",
            "MultiPoint",
            "LineString",
            "MultiLineString",
            "Polygon",
            "MultiPolygon",
        ];

        const orderA = featureOrder.indexOf(featureTypeA);
        const orderB = featureOrder.indexOf(featureTypeB);

        const comparison = orderA - orderB;
        return reverse ? -comparison : comparison;
    });
};

const transformGeoJSONCoordinates = async (coordinates, source, target) => {
    const source_text = `EPSG:${source}`
    const target_text = `EPSG:${target}`
    
    [source_text, target_text].forEach(async (crs) => {
        if (!proj4.defs(crs)) await fetchProj4Def(crs)
    })

    if (proj4.defs(source_text) && proj4.defs(target_text)) {
        loopThroughCoordinates(coordinates, (coords) => {
            coords[0], coords[1] = proj4(source_text, target_text, coords)
        })
    }

    return coordinates
}

const createAttributionTable = (geojson) => {
    if (geojson.type !== 'FeatureCollection') return

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

const createGeoJSONChecklist = async (geojsonList, group, {
    pane,
    controller,
    customStyleParams,
} = {}) => {
    const container = document.createElement('div')
    container.className = 'd-flex flex-column gap-2 geojson-checklist'

    for (const title in geojsonList) {
        if (controller?.signal.aborted) return
        
        const geojson = geojsonList[title]
        if (!geojson) continue

        const features = geojson.features
        if (!features?.length) continue

        sortGeoJSONFeaturesByType(geojson)        

        const geojsonLayer = await getLeafletGeoJSONLayer({
            geojson,
            group,
            pane,
            title,
            attribution: createAttributionTable(geojson)?.outerHTML,
            customStyleParams,
        })

        const featureLayers = geojsonLayer.getLayers()
        if (!featureLayers.length) continue

        const listFeatures = featureLayers.length <= 100
        const disableCheck = featureLayers.length > 1000

        const geojsonContainer = document.createElement('div')
        container.appendChild(geojsonContainer)

        const pCheckbox = geojsonLayer._checkbox = createFormCheck({
            parent: geojsonContainer,
            labelInnerText: `${title} (${formatNumberWithCommas(featureLayers.length)})`,
            formCheckClass: `d-flex gap-2 `,
            disabled: disableCheck,
        }).querySelector('input')

        const contentCollapse = document.createElement('div')
        contentCollapse.id = generateRandomString()
        contentCollapse.className = `ps-3 collapse`
        geojsonContainer.appendChild(contentCollapse)
        
        if (listFeatures) {
            const featuresContainer = document.createElement('div')
            contentCollapse.appendChild(featuresContainer)

            for (const featureLayer of featureLayers) {
                if (controller?.signal.aborted) return
                
                featureLayer._checkbox = createFormCheck({
                    parent: featuresContainer,
                    labelInnerText: featureLayer._title,
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
                            geojsonContainer.querySelectorAll('input.form-check-input')
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
                            geojsonContainer.querySelectorAll('input.form-check-input')
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

const mapForFetchGeoJSON = new Map()
const fetchGeoJSON = async ({
    handler,
    event,
    options = {}
}, {
    controller,
    abortBtns,
} = {}) => {
    const map = ['target', '_leafletMap'].map(p => event[p]).find(p => p instanceof L.Map)
    console.log(map)
    const latlng = event.latlng
    const queryGeom = (latlng ? turf.point(
        Object.values(latlng).reverse()
    ) : L.rectangle(map.getBounds()).toGeoJSON()).geometry

    const dbKey = [handler.name, JSON.stringify(options)].join(';')
    const mapKey = [dbKey, turf.bbox(queryGeom).join(','), controller.id].join(';')

    if (mapForFetchGeoJSON.has(mapKey)) {
        return await mapForFetchGeoJSON.get(mapKey)
    }

    const geojsonPromise = (async () => {
        try {
            let geojson
            
            const queryExtent = latlng ? turf.buffer(
                queryGeom, 
                getLeafletMeterScale(map)/2/1000
            ).geometry : queryGeom

            geojson = await (async () => {
                if (controller?.signal.aborted) return
                
                const cachedData = await getFromGeoJSONDB(dbKey)
                if (!cachedData) return

                const cachedGeoJSON = cachedData.geojson
                const cachedQueryExtent = cachedData.queryExtent
                
                console.log(L.geoJSON(queryExtent).addTo(map))
                // L.geoJSON(cachedQueryExtent).addTo(map)

                try {
                    const equalBounds = turf.booleanEqual(queryExtent, cachedQueryExtent)
                    const withinBounds = turf.booleanWithin(queryExtent, cachedQueryExtent)
                    if (!equalBounds && !withinBounds) return
                } catch (error) {
                    return
                }
                
                cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
                    if (controller?.signal.aborted) return
                    const featureBbox = turf.bboxPolygon(turf.bbox(feature))
                    return turf.booleanIntersects(queryExtent, featureBbox)
                })
                
                if (cachedGeoJSON.features.length === 0) return
                return cachedGeoJSON
            })()
            
            if (!geojson) {
                geojson = await (async () => {
                    const geojson = await handler(event, {...options, controller, abortBtns})
                    if (!geojson?.features?.length) return
                    
                    if (controller?.signal.aborted) return
                    handleGeoJSON(geojson, {queryGeom, controller, abortBtns})
                    
                    if (controller?.signal.aborted) return
                    await updateGeoJSONOnDB(
                        dbKey, 
                        turf.clone(geojson),
                        queryExtent,
                    )

                    return geojson
                })()
            }
            
            return geojson
        } catch (error) {
            throw error
        } finally {
            setTimeout(() => mapForFetchGeoJSON.delete(mapKey), 1000);
        }
    })()

    mapForFetchGeoJSON.set(mapKey, geojsonPromise)
    return geojsonPromise
}

const fetchGeoJSONs = async (fetchers, {
    controller,
    abortBtns,
} = {}) => {
    const fetchedGeoJSONs = await Promise.all(Object.values(fetchers).map(fetcher => {
        return fetchGeoJSON(fetcher, {abortBtns, controller})
    }))

    if (controller.signal.aborted) return

    const geojsons = {}
    for (let i = 0; i < fetchedGeoJSONs.length; i++) {
        geojsons[Object.keys(fetchers)[i]] = fetchedGeoJSONs[i]
    }

    return geojsons
}

const mapForFilterGeoJSON = new Map()
const filterGeoJSON = async (id, geojson, {
    map,
    controller,
} = {}) => {
    if (!geojson) return

    let geojsonPromise

    const mapKey = `${id};${map?.getContainer().id}`
    if (mapForFilterGeoJSON.has(mapKey)) {
        return mapForFilterGeoJSON.get(mapKey)
    }

    const signal = controller?.signal
    geojsonPromise = (async () => {
        try {
            if (signal?.aborted) throw new Error()

            const clonedGeoJSON = turf.clone(geojson)
            const geojsonBbox = turf.bboxPolygon(turf.bbox(clonedGeoJSON)).geometry
            const geojsonExtent = turf.area(geojsonBbox) ? geojsonBbox : turf.buffer(
                geojsonBbox, 1/100000
            ).geometry
        
            if (map) {
                const queryExtent = L.rectangle(map.getBounds()).toGeoJSON().geometry
                if (!turf.booleanIntersects(queryExtent, geojsonBbox)) return
    
                clonedGeoJSON.features = clonedGeoJSON.features.filter(feature => {
                    if (signal?.aborted) throw new Error()
                    const featureBbox = turf.bboxPolygon(turf.bbox(feature))
                    return turf.booleanIntersects(queryExtent, featureBbox)
                })
            }

            if (clonedGeoJSON.features.length === 0) return
            return clonedGeoJSON
        } catch (error) {
            throw error
        } finally {
            setTimeout(() => mapForFilterGeoJSON.delete(mapKey), 1000)
        }
    })()
    
    mapForFilterGeoJSON.set(mapKey, geojsonPromise)

    return geojsonPromise
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

