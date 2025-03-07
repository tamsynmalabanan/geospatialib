const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const container = document.createElement('div')
    container.className = `d-flex flex-nowrap gap-2`

    const [lng, lat] = ptFeature.geometry.coordinates
    
    const latSpan = document.createElement('span')
    latSpan.innerText = `${lat.toFixed(precision)} ${lat >= 0 ? 'N' : 'S'}`
    container.appendChild(latSpan)
    
    const lngSpan = document.createElement('span')
    lngSpan.innerText = `${lng.toFixed(precision)} ${lng >= 0 ? 'E' : 'W'}`
    container.appendChild(lngSpan)

    const formatRadios = createRadios({
        'DD': {
            checked:true,
            labelAttrs: {
                'data-bs-title':'Decimal Degrees',
            }
        },
        'DMS': {
            labelAttrs: {
                'data-bs-title':'Degrees, minutes, seconds',
            }
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