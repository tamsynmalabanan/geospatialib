const handleLeafletMapPanels = (map) => {
    const topRightControlCorner = map._controlCorners.topright
    topRightControlCorner.classList.add('d-flex', 'vh-100')

    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column', 'flex-grow-1', 'ms-60', 'mb-60')
        
        const [toggle, body] = createMapPanels(map.getContainer())
        panel.appendChild(toggle)
        panel.appendChild(body)
            
        return panel
    }

    control.addTo(map)
}

const applyThemeToLeafletControls = (container) => {
    addClassListToSelection(
        container, 
        '.leaflet-bar a, .leaflet-control, .leaflet-control a', 
        [`text-bg-${getPreferredTheme()}`, 'text-reset']
    )
}