document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        if (dataset.mapPanels === 'true') handleLeafletMapPanels(map)
        container.className = `bg-${getPreferredTheme()} ${container.className} ${dataset.mapClass || ''}`
        addLeafletBasemapLayer(map)
        handleLeafletLayerGroups(map)
        handleLeafletMapControls(map)
        elementResizeObserver(container, () => map.invalidateSize())

        map._initComplete = true
        map.fire('initComplete')
    })
})