document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        container.className = `bg-${getPreferredTheme()} ${container.className} ${dataset.mapClass || ''}`
        addLeafletBasemapLayer(map)
        handleLeafletLayerGroups(map)
        elementResizeObserver(container, () => map.invalidateSize())
        if (dataset.mapPanels === 'true') handleLeafletMapPanels(map)

        map._initComplete = true
        map.fire('initComplete')
    })
})