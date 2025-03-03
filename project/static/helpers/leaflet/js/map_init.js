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

        if (isViewHeight(container)) constructMapPanels(container, options={
            panelsContainer: container.querySelector('.leaflet-top.leaflet-right')
        })

        map._initComplete = true
        map.fire('initComplete')
    })
})