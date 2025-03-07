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
    container.appendChild(latSpan)
    
    const lngSpan = document.createElement('span')
    lngSpan.innerText = lngDD
    container.appendChild(lngSpan)

    const formatRadios = createRadios({
        'DD': {
            checked:true,
            labelAttrs: {
                'data-bs-title':'Decimal Degrees',
            },
            inputAttrs: {
                onclick: () => {
                    latSpan.innerText = latDD
                    lngSpan.innerText = lngDD
                },
            },
        },
        'DMS': {
            labelAttrs: {
                'data-bs-title':'Degrees, minutes, seconds',
            },
            inputAttrs: {
                onclick: () => {
                    latSpan.innerText = `${ddToDMS(Math.abs(lat)).toString()} ${latDir}`
                    lngSpan.innerText = `${ddToDMS(Math.abs(lng)).toString()} ${lngDir}`
                },
            },
        },
    }, {
        containerClassName: 'd-flex flex-nowrap gap-2 ms-auto'
    })
    formatRadios.querySelectorAll('label').forEach(label => {
        label.setAttribute('data-bs-toggle', 'tooltip')
        new bootstrap.Tooltip(label)
    })
    container.appendChild(formatRadios)

    const [dropdown, toggle, menu] = createDropdown({
        btnClassName: 'btn-sm bg-transparent border-0 p-0',
        btnIconClass: 'bi bi-three-dots'
    })
    menu.style.minHeight = '100px'
    toggle.classList.remove('dropdown-toggle')
    container.appendChild(dropdown)

    return container
}