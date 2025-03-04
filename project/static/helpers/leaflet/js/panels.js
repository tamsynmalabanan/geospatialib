const handleLeafletMapPanels = (map) => {
    const topRightControlCorner = map._controlCorners.topright
    topRightControlCorner.classList.add('vh-100', 'd-flex')

    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column', 'ms-60', 'mb-60', 'h-100')
        // panel.classList.remove('leaflet-control')
        
        const [toggle, body] = createMapPanels(map.getContainer())
        
        // toggle.classList.add('leaflet-control')
        panel.appendChild(toggle)

        // body.classList.add('leaflet-control')
        panel.appendChild(body)
            
        return panel
    }

    control.addTo(map)
}
