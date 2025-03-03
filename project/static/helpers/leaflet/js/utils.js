const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const handleLeafletMapPanels = (map) => {
    const topRightControlCorner = map._controlCorners.topright
    topRightControlCorner.classList.add('d-flex', 'vh-100')

    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column', 'flex-grow-1', 'ms-5', 'mb-5')
        
        const [toggle, body] = createMapPanels(container)
        panel.appendChild(toggle)
        panel.appendChild(body)
            
        return panel
    }

    control.addTo(map)
}