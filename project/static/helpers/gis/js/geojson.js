const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const container = document.createElement('div')
    container.className = `d-flex flex-nowrap gap-2`

    const [lng, lat] = ptFeature.geometry.coordinates
    
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    const latDD = `${Math.abs(lat).toFixed(precision)} ${latDir}`
    const lngDD = `${Math.abs(lng).toFixed(precision)} ${lngDir}`

    const latSpan = document.createElement('span')
    latSpan.innerText = latDD
    
    const lngSpan = document.createElement('span')
    lngSpan.innerText = lngDD
    
    const copyBtn = createIcon({className:'bi bi-clipboard'})
    copyBtn.classList.remove('pe-none')
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(`${latSpan.innerText} ${lngSpan.innerText}`)    
    })

    document.addEventListener('click', () => console.log(event))

    container.appendChild(copyBtn)
    container.appendChild(latSpan)
    container.appendChild(lngSpan)

    const formatRadios = createRadios({
        'DD': {
            checked:true,
            labelAttrs: {
                'data-bs-title':'Decimal Degrees',
            },
        },
        'DMS': {
            labelAttrs: {
                'data-bs-title':'Degrees, minutes, seconds',
            },
        },
    }, {
        containerClassName: 'd-flex flex-nowrap gap-2 ms-auto'
    })
    formatRadios.querySelectorAll('label').forEach(label => {
        label.setAttribute('data-bs-toggle', 'tooltip')
        new bootstrap.Tooltip(label)

        const input = formatRadios.querySelector(`#${label.getAttribute('for')}`)
        input.addEventListener('click', () => {
            if (label.innerText === 'DD') {
                latSpan.innerText = latDD
                lngSpan.innerText = lngDD
            }

            if (label.innerText === 'DMS') {
                latSpan.innerText = `${ddToDMS(Math.abs(lat)).toString()} ${latDir}`
                lngSpan.innerText = `${ddToDMS(Math.abs(lng)).toString()} ${lngDir}`
            }
        })
    })
    container.appendChild(formatRadios)

    return container
}