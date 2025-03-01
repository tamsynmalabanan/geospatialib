const leafletMapHandler = (map) => {
    const container = map.getContainer()
    const dataset = container.parentElement.dataset

    const handlers = {
        container: () => container.className = `${container.className} z-1 ${dataset.mapClass || ''}`
    }

    Object.values(handlers).forEach(handler => handler())
    
    map._initComplete = true
    map.fire('initComplete')
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        leafletMapHandler(map)
    })
})