document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        // apply theme
        createLeafletOSMLayer(themed=true).addTo(map)
        // container.querySelectorAll(
        //     '.leaflet-bar a, .leaflet-control, .leaflet-control a'
        // ).forEach(el => el.classList.add(`text-bg-${getPreferredTheme()}`, 'text-reset'))

        addClassListToSelection(
            container, 
            '.leaflet-bar a, .leaflet-control, .leaflet-control a', 
            `text-bg-${getPreferredTheme()}`, 'text-reset'
        )
        
        container.className = `${container.className} ${dataset.mapClass || ''}`
        elementResizeObserver(container, () => map.invalidateSize())

        map._initComplete = true
        map.fire('initComplete')
    })
})