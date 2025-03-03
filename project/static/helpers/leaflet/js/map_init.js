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
            const control = L.control({position:'topright'})
            control.onAdd = (map) => {
                const container = L.DomUtil.create('div', 'map-panel')
                
                const [toggle, body] = createMapPanels(container)
                console.log(toggle, body)
                
                container.appendChild(toggle)
                container.appendChild(body)
                    
                return container
            }
        
            control.addTo(map)    
        }

        map._initComplete = true
        map.fire('initComplete')
    })
})