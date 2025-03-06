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
    
    const menuTh = document.createElement('th')
    menuTh.className = 'text-center'
    menuTh.setAttribute('scope', 'col')
    headTr.appendChild(menuTh)

    const [dropdownToggle, dropdownMenu] = createDropdown({
        btnClassName: 'bg-transparent border-0 p-0',
        btnIconClass: 'bi bi-list',
        btnTitle: 'Toggle menu',
    })
    dropdownToggle.classList.remove('dropdown-toggle')
    menuTh.parentElement.appendChild(dropdownToggle)

    const formatDMS = createDropdownMenuLi({
        innerText: 'Coordinates in DDMMSS format',
        parent: dropdownMenu
    })

    const valueTr = document.createElement('tr')
    tbody.appendChild(valueTr)
    for (const coord in coords) {
        const td = document.createElement('td')
        td.innerText = coords[coord].toFixed(precision)
        valueTr.appendChild(td)
    }
    
    const formatTd = document.createElement('td')
    formatTd.className = 'text-center'
    formatTd.innerText = 'DD'
    valueTr.appendChild(formatTd)

    return table
}