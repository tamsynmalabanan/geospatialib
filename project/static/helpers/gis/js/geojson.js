const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const table = document.createElement('table')
    table.className = 'table table-borderless table-dark table-sm m-0 p-0'

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
    
    const formatTh = document.createElement('th')
    formatTh.setAttribute('scope', 'col')
    formatTh.innerText = 'Format'
    headTr.appendChild(formatTh)
    
    const valueTr = document.createElement('tr')
    tbody.appendChild(valueTr)
    for (const coord in coords) {
        const td = document.createElement('td')
        td.innerText = coords[coord].toFixed(precision)
        valueTr.appendChild(td)
    }
    
    const formatTd = document.createElement('td')
    formatTd.innerText = 'decimal degrees'
    valueTr.appendChild(formatTd)

    return table
}