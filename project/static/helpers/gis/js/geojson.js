const handleGeoJSON = async (geojson, {
    defaultGeom,
    sortFeatures = false,
} = {}) => {
    const crsInfo = geojson?.crs?.properties?.name?.split('EPSG::')
    const crs = crsInfo?.length ? parseInt(crsInfo[1]) : null
    
    geojson.features.forEach(async (feature) => {
        feature.geometry = feature.geometry || defaultGeom
        const geomAssigned = !feature.geometry && defaultGeom
        
        if (crs && crs !== 4326 && !geomAssigned) {
            await transformGeoJSONCoordinates(feature.geometry.coordinates, crs, 4326)        
        }
        
        if (feature.id) feature.properties.feature_id = feature.id
    })
    
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
    controller,
    styleParams,
    defaultGeom,
} = {}) => {
    const container = document.createElement('div')
    container.className = 'd-flex flex-column gap-2'

    for (const title in geojsonList) {
        if (controller?.signal.aborted) return
        
        const geojson = geojsonList[title]
        handleGeoJSON(geojson, {
            defaultGeom,
            sortFeatures: true,
        })
        
        if (!geojson?.features?.length) continue
        
        const geojsonContainer = document.createElement('div')
        container.appendChild(geojsonContainer)
        
        const layer = getLeafletGeoJSONLayer({
            geojson,
            styleParams,
            title,
        })
        const featureLayers = layer.getLayers()
        const listFeatures = featureLayers.length <= 100
        const disableCheck = featureLayers.length > 1000

        const clickHandler = (e, layer) => {
            const checkInput = e.target
            const isChecked = checkInput.checked
            const isParent = !layer.feature

            const featureChecks = geojsonContainer.querySelectorAll(`input[data-geojson-parent="${checkInput.id}"]`)
            
            const parentId = checkInput.dataset.geojsonParent

            isChecked ? group.addLayer(layer) : group.removeLayer(layer)

            if (isParent && featureChecks) {
                featureChecks.forEach(featureCheck => {
                    if (featureCheck.checked !== isChecked) featureCheck.click()
                })
            } else if (parentId) {
                const allFeatureChecks = geojsonContainer.querySelectorAll(`input[data-geojson-parent="${parentId}"]`)
                const checkParent = Array.from(allFeatureChecks).some(check => check.checked)
                
                const parent = geojsonContainer.querySelector(`#${parentId}`)
                parent.checked = checkParent
                
                if (!checkParent && layer._eventParents.length) {
                    const parentLayer = Object.values(layer._eventParents)[0]
                    group.removeLayer(parentLayer)
                }
            }
        }

        const parentCheck = createFormCheck({
            parent: geojsonContainer,
            labelInnerText: `${title} (${featureLayers.length})`,
        }).querySelector('input')
        if (disableCheck) {
            parentCheck.disabled = true
        } else {
            parentCheck.addEventListener('click', (e) => clickHandler(e, layer))
        }
        
        const contentCollapse = document.createElement('div')
        contentCollapse.id = generateRandomString()
        contentCollapse.className = `ps-3 collapse`
        geojsonContainer.appendChild(contentCollapse)
        
        const contentToggle = createIcon({
            parent: parentCheck.parentElement,
            peNone: false,
            className: 'ms-auto dropdown-toggle'
        })
        contentToggle.style.cursor = 'pointer'
        contentToggle.setAttribute('data-bs-toggle', 'collapse')
        contentToggle.setAttribute('data-bs-target', `#${contentCollapse.id}`)
        contentToggle.setAttribute('aria-controls', contentCollapse.id)
        contentToggle.setAttribute('aria-expanded', 'false')
        
        if (listFeatures) {
            const featuresContainer = document.createElement('div')
            contentCollapse.appendChild(featuresContainer)

            for (const featureLayer of featureLayers) {
                if (controller?.signal.aborted) return
                
                const feature = featureLayer.feature
                const featureCheck = createFormCheck({
                    parent: featuresContainer,
                    labelInnerText: featureLayer._title,
                }).querySelector('input')
                featureCheck.setAttribute('data-geojson-parent', parentCheck.id)
                featureCheck.addEventListener('click', (e) => clickHandler(e, featureLayer))
            }
        }

        const info = {}
        Object.keys(geojson).forEach(key => {
            if (!Array('features', 'type').includes(key)) {
                info[key] = geojson[key]
            }
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

