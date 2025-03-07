const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const table = document.createElement('table')
    table.className = `table table-borderless table-${getPreferredTheme()} table-sm m-0 p-0`

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)

    const [lng, lat] = ptFeature.geometry.coordinates
    const coords = {
        'Longitude': lng,
        'Latitude': lat,
    }    

    const headTr = document.createElement('tr')
    tbody.appendChild(headTr)
    for (const coord in coords) {
        const th = document.createElement('th')
        th.setAttribute('scope','col')
        th.innerText = coord
        headTr.appendChild(th)
    }
    
    // const menuTh = document.createElement('th')
    // menuTh.className = 'text-center'
    // menuTh.setAttribute('scope','col')
    // headTr.appendChild(menuTh)

    // const [dropdown, toggle, menu] = createDropdown({
    //     btnClassName: 'bg-transparent p-0 border-0 btn-sm'
    // })
    // menuTh.appendChild(dropdown)
    
    const valueTr = document.createElement('tr')
    tbody.appendChild(valueTr)
    for (const coord in coords) {
        const td = document.createElement('td')
        td.innerText = coords[coord].toFixed(precision)
        valueTr.appendChild(td)
    }
    
    const formatTd = document.createElement('td')
    formatTd.className = 'text-center'
    valueTr.appendChild(formatTd)

    const formatRadios = createRadios({
        'DD': {
            checked:true,
            tooltip: 'Decimal degrees',
        },
        'DMS': {
            tooltip: 'Degrees, minutes, seconds',
        },
    }, {
        containerClassName: 'd-flex flex-nowrap gap-2'
    })
    formatTd.appendChild(formatRadios)

    return table
}