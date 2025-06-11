document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        container.className = `bg-${getPreferredTheme()} ${container.className} ${dataset.mapClass || ''}`
        addLeafletBasemapLayer(map)
        handleLeafletLayerGroups(map)   
        if (dataset.mapPanels === 'true') handleLeafletMapPanels(map)
        handleLeafletMapControls(map)
        elementResizeObserver(container, () => map.invalidateSize())
        assignMapObservers(map)

        const queryPane = map.getPane('queryPane') || map.createPane('queryPane')
        queryPane.style.zIndex = 599

        const cachedBbox = localStorage.getItem(`map-bbox-${map.getContainer().id}`)
        if (cachedBbox) map.fitBounds(L.geoJSON(JSON.parse(cachedBbox)).getBounds())

        map._initComplete = true
        map.fire('initComplete')
    })
})