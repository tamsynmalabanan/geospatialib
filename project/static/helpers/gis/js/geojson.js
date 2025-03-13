const createGeoJSONChecklist = async (geojsonList, {
    controller,
} = {}) => {
    const container = document.createElement('div')

    for (const title in geojsonList) {
        const geojson = geojsonList[title]

        if (!geojson?.features?.length) continue

        console.log(title, geojson)

        const geojsonContainer = document.createElement('div')
        container.appendChild(geojsonContainer)

        const titleCheck = createFormCheck({
            parent: geojsonContainer,
            labelInnerText: title,
        })

        const infoKeys = Object.keys(geojson).filter(key => !Array('features', 'type').includes(key))
        if (infoKeys.length) {
            const infoTable = document.createElement('table')
            infoTable.className = `table table-${getPreferredTheme()} table-borderless table-sm`
            geojsonContainer.appendChild(infoTable)
    
            const infoTBody = document.createElement('tbody')
            infoTable.appendChild(infoTBody)

            const handler = (key, value, {
                parent,
                prefixes = [],
            } = {}) => {
                if (typeof value === 'object') {
                    Object.keys(value).forEach(key => {
                        const subValue = value[key, [...prefixes, ...[key]]]
                        console.log(prefixes)
                        handler(key, subValue, {
                            parent,
                            prefixes: [...prefixes, ...[key]]
                        })
                    })
                } else {
                    const tr = document.createElement('tr')
                    parent.appendChild(tr)

                    const th = document.createElement('th')
                    th.setAttribute('scope', 'row')
                    th.innerText = [...new Set([...prefixes, ...[key]])].join(' ')
                    tr.appendChild(th)

                    const td = document.createElement('td')
                    td.innerText = value.toString()
                    tr.appendChild(td)
                }
            }

            for (const key of infoKeys) {
                const value = geojson[key]
                handler(key, value, {parent:infoTBody})
            }
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