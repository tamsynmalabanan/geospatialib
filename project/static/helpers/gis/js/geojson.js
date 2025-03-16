const createGeoJSONChecklist = async (geojsonList, group, {
    controller,
    styleParams
} = {}) => {
    const container = document.createElement('div')

    for (const title in geojsonList) {
        if (controller?.signal.aborted) return
        
        const geojson = geojsonList[title]
        
        if (!geojson?.features?.length) continue
        
        const geojsonContainer = document.createElement('div')
        container.appendChild(geojsonContainer)
        
        const layer = getLeafletGeoJSONLayer({
            geojson,
            styleParams
        })
        
        const clickHandler = (e, layer) => {
            const check = e.target
            if (check.checked) {
                check.title = 'Remove from map'
                group.addLayer(layer)
            } else {
                check.title = 'Add to map'
                group.removeLayer(layer)
            }
        }

        const titleCheck = createFormCheck({
            parent: geojsonContainer,
            labelInnerText: title,
        }).querySelector('input')
        titleCheck.title = 'Add to map'
        titleCheck.addEventListener('click', (e) => clickHandler(e, layer))
        
        const contentCollapse = document.createElement('div')
        contentCollapse.className = 'ps-3'
        geojsonContainer.appendChild(contentCollapse)

        const featuresContainer = document.createElement('div')
        contentCollapse.appendChild(featuresContainer)
        
        for (const featureLayer of layer.getLayers()) {
            if (controller?.signal.aborted) return

            const feature = featureLayer.feature
            const featureCheck = createFormCheck({
                parent: featuresContainer,
                labelInnerText: feature.id || feature.properties.name || feature.properties.id,
            }).querySelector('input')
            featureCheck.title = 'Add to map'
            featureCheck.addEventListener('click', (e) => clickHandler(e, featureLayer))
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