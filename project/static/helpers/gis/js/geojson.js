const createGeoJSONChecklist = (geojsonList) => {
    const container = document.createElement('div')
    console.log(geojsonList)

    return container
}

const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
    const container = document.createElement('div')
    container.className = `d-flex flex-nowrap gap-2`

    for (const coord of ptFeature.geometry.coordinates) {
        const span = document.createElement('span')
        span.innerText = coord.toFixed(precision)
        container.appendChild(span)
    }
    
    const formatRadios = createRadios({
        'DD': {
            checked:true,
            tooltip: 'Decimal degrees',
        },
        'DMS': {
            tooltip: 'Degrees, minutes, seconds',
        },
    }, {
        containerClassName: 'd-flex flex-nowrap gap-2 ms-auto'
    })
    container.appendChild(formatRadios)

    const [dropdown, toggle, menu] = createDropdown({
        btnClassName: 'btn-sm bg-transparent border-0 p-0 mb-2',
        btnIconClass: 'bi bi-three-dots'
    })
    toggle.classList.remove('dropdown-toggle')
    container.appendChild(dropdown)

    return container
}

// const createPointCoordinatesTable = (ptFeature, {precision = 6}={}) => {
//     const table = document.createElement('table')
//     table.className = `table table-borderless table-${getPreferredTheme()} table-sm m-0 p-0`

//     const tbody = document.createElement('tbody')
//     table.appendChild(tbody)


//     const headTr = document.createElement('tr')
//     tbody.appendChild(headTr)
   
//     const th = document.createElement('th')
//     th.setAttribute('scope','col')
//     th.setAttribute('colspan','3')
//     th.innerText = 'Longitude & latitude'
//     headTr.appendChild(th)
    
//     const valueTr = document.createElement('tr')
//     tbody.appendChild(valueTr)
//     for (const coord of ptFeature.geometry.coordinates) {
//         const td = document.createElement('td')
//         td.innerText = coord.toFixed(precision)
//         valueTr.appendChild(td)
//     }
    
//     const formatTd = document.createElement('td')
//     formatTd.className = 'text-center'
//     valueTr.appendChild(formatTd)

//     const formatRadios = createRadios({
//         'DD': {
//             checked:true,
//             tooltip: 'Decimal degrees',
//         },
//         'DMS': {
//             tooltip: 'Degrees, minutes, seconds',
//         },
//     }, {
//         containerClassName: 'd-flex flex-nowrap gap-2'
//     })
//     formatTd.appendChild(formatRadios)

//     return table
// }