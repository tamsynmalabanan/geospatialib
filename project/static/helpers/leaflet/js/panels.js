const handleLeafletQueryPanel = (map, parent) => {
    const container = document.createElement('div')
    container.className = 'd-flex flex-column'
    parent.appendChild(container)

    const toolbar = document.createElement('div')
    toolbar.className = 'border rounded d-flex'
    container.appendChild(toolbar)

    const queryTools = {
        locationCoords: {
            iconClass: 'bi-geo-alt-fill',
            title: 'Query location coordinates',
        },
        osmPoint: {
            iconClass: 'bi-pin-map-fill',
            title: 'Query OSM at point',
        },
        osmBbox: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in bbox',
        },
        layerPoint: {
            iconClass: 'bi-stack',
            title: 'Query layers at point',
        },
        divider: {
            tag: 'div',
            btnClass: 'border-0 rounded-0 border-end bg-0 p-0 my-1 mx-2',
        },
        cancel: {
            iconClass: 'bi-arrow-counterclockwise',
            title: 'Cancel ongoing query',
            disabled: true,
        },
        clear: {
            iconClass: 'bi-trash-fill',
            title: 'Clear query results',
            disabled: true,
        },
    }

    Object.keys(queryTools).forEach(tool => {
        const data = queryTools[tool]
        
        const btn = document.createElement(data.tag || 'button')
        btn.className = data.btnClass || `btn btn-sm btn-${getPreferredTheme()}`
        if (btn.tagName === 'button') btn.setAttribute('type', 'button')
        if (data.iconClass) createIcon({className:`bi ${data.iconClass}`, parent:btn})
        if (data.title) btn.setAttribute('title', data.title)
        if (data.disabled) btn.setAttribute('disabled', true)
        toolbar.appendChild(btn)
    })

    const results = document.createElement('div')
    container.appendChild(results)
}

const handleLeafletMapPanels = (map) => {
    const topRightControlCorner = map._controlCorners.topright
    topRightControlCorner.classList.add('vh-100', 'd-flex')

    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column', 'ms-60', 'mb-70')
        panel.style.maxHeight = '100%'
        
        const [toggle, body] = createMapPanels(map.getContainer())
        panel.appendChild(toggle)
        panel.appendChild(body)
        handleLeafletQueryPanel(map, body.querySelector(`#${body.id}-accordion-query .accordion-body`))
        
        return panel
    }
    
    control.addTo(map)
}
