const handleLeafletMapPanels = (map) => {
    const topRightControlCorner = map._controlCorners.topright
    topRightControlCorner.classList.add('d-flex', 'vh-100')

    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column', 'ms-60', 'mb-60')
        panel.style.maxHeight = '100%'
        
        const [toggle, body] = createMapPanels(map.getContainer())
        panel.appendChild(toggle)
        panel.appendChild(body)
            
        return panel
    }

    control.addTo(map)
}
