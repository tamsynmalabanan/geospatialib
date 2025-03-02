document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        createLeafletOSMLayer(themed=true).addTo(map)
        container.querySelectorAll('leaflet-bar, .leaflet-control').forEach(el => el.classList.add(`text-bg-${getPreferredTheme()}`))
        // container.querySelectorAll('.leaflet-bar a').forEach(el => el.classList.add(`text-bg-${getPreferredTheme()}`))
        container.className = `${container.className} ${dataset.mapClass || ''}`
        elementResizeObserver(container, () => map.invalidateSize())

        map._initComplete = true
        map.fire('initComplete')
    })
})