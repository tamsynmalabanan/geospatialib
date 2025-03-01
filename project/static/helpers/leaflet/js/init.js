const leafletMapHandler = (map) => {
    const container = map.getContainer()
    const dataset = container.parentElement.dataset

    Array(
        () => container.className = `${container.className} z-1 ${dataset.mapClass || ''}`,
        () => elementResizeObserver(container, map.invalidateSize)
    ).forEach(handler => handler())
    
    map._initComplete = true
    map.fire('initComplete')
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        leafletMapHandler(map)
    })
})