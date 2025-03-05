const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const table = document.createElement('table')
    table.className = 'table table-borderless table-dark table-sm'

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)

    const [lng, lat] = ptFeature.geometry.coordinates
    const coords = {
        'Longitude': lng,
        'Latitude': lat,
    }    

    for (const coord in coords) {
        const tr = document.createElement('tr')
        tbody.appendChild(tr)

        const th = document.createElement('th')
        th.setAttribute('scope', 'row')
        th.innerText = coord
        tr.appendChild(th)

        const coordTd = document.createElement('td')
        coordTd.innerText = coords[coord].toFixed(precision)
        tr.appendChild(coordTd)

        const menuTd = document.createElement('td')
        menuTd.innerText = 'menu'
        tr.appendChild(menuTd)
    }
    
    return table
}