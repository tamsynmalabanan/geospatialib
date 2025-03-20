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

        map._initComplete = true
        map.fire('initComplete')
    })
})