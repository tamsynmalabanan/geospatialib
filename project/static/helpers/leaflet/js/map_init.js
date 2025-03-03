document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        createLeafletBasemapLayer().addTo(map)
        addClassListToSelection(
            container, 
            '.leaflet-bar a, .leaflet-control, .leaflet-control a', 
            [`text-bg-${getPreferredTheme()}`, 'text-reset']
        )
        
        container.className = `${container.className} ${dataset.mapClass || ''}`
        elementResizeObserver(container, () => map.invalidateSize())

        if (isViewHeight(container)) {
            const topRightControlCorner = map._controlCorners.topright
            topRightControlCorner.classList.add('d-flex', 'vh-100')

            const control = L.control({position:'topright'})
            control.onAdd = (map) => {
                const panel = L.DomUtil.create('div', 'map-panel')
                panel.classList.add('d-flex', 'flex-column', 'flex-grow-1', 'mb-10')
                
                const [toggle, body] = createMapPanels(container)
                console.log(toggle, body)
                
                panel.appendChild(toggle)
                panel.appendChild(body)
                    
                return panel
            }
        
            control.addTo(map)    
        }

        map._initComplete = true
        map.fire('initComplete')
    })
})