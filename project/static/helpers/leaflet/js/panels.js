const handleLeafletQueryPanel = (map, parent) => {
    const mapContainer = map.getContainer()
    const container = document.createElement('div')
    container.className = 'd-flex flex-column'
    parent.appendChild(container)

    const toolbar = document.createElement('div')
    toolbar.id = `${mapContainer.id}-panels-query-toolbar`
    toolbar.className = 'd-flex px-3 py-2 border-bottom'
    container.appendChild(toolbar)

    const results = document.createElement('div')
    container.appendChild(results)

    const queryTools = {
        locationCoords: {
            iconClass: 'bi-geo-alt-fill',
            title: 'Query location coordinates',
            mapCursor: 'pointer',
            mapClickCallback: (e) => {
                const geojson = [turf.point([e.latlng.lng, e.latlng.lat])]
                results.appendChild(createGeoJSONChecklist(geojson))
            }
        },
        osmPoint: {
            iconClass: 'bi-pin-map-fill',
            title: 'Query OSM at point',
            mapCursor: 'pointer',
        },
        osmView: {
            iconClass: 'bi-bounding-box-circles',
            title: 'Query OSM in map view',
            btnclickCallback: () => {}
        },
        layerPoint: {
            iconClass: 'bi-stack',
            title: 'Query layers at point',
            mapCursor: 'pointer',
        },
        divider: {
            tag: 'div',
            className: 'vr m-2',
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
        toolbar.appendChild(
            !data.tag || data.tag === 'button' ? 
            createButton({...data, ...{
                id: `${toolbar.id}-${tool}`,
                className:`btn-sm btn-${getPreferredTheme()}`,
                clickCallback: () => {
                    const btn = event.target
                    L.DomEvent.stopPropagation(event);
                    L.DomEvent.preventDefault(event);        
                    
                    const queryMode = map._queryMode
                    const toolIsQueryMode = queryMode === tool
                    
                    if (queryMode && !toolIsQueryMode) toolbar.querySelector(`#${toolbar.id}-${queryMode}`).click()
                    Array(`btn-${getPreferredTheme()}`, 'btn-primary').forEach(className => btn.classList.toggle(className))
                    mapContainer.style.cursor = !toolIsQueryMode ? data.mapCursor || '' : ''

                    if (data.mapClickCallback) toolIsQueryMode ? map.off('click', data.mapClickCallback) : map.on('click', data.mapClickCallback)
                    map._queryMode = toolIsQueryMode ? undefined : tool

                    if (data.btnclickCallback) btnclickCallback()
                }
            }}) :
            customCreateElement(data.tag, data)
        )
    })
}

const handleLeafletMapPanels = (map) => {
    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column')
        
        const [toggle, body] = createMapPanels(map.getContainer())
        panel.appendChild(toggle)
        panel.appendChild(body)
        handleLeafletQueryPanel(map, body.querySelector(`#${body.id}-accordion-query .accordion-body`))
        
        return panel
    }
    
    control.addTo(map)
}
