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

    const headTr = document.createElement('tr')
    for (const coord in coords) {
        const th = document.createElement('th')
        th.setAttribute('scope','col')
        th.innerText = coord
        headTr.appendChild(th)
    }

    const menuTh = document.createElement('th')
    th.setAttribute('scope', 'col')
    th.innerText = 'menu'
    headTr.appendChild(menuTh)

    const valueTr = document.createElement('tr')
    for (const coord in coords) {
        const td = document.createElement('td')
        td.innerText = coords[coord].toFixed(precision)
        valueTr.appendChild(td)
    }

    return table
}