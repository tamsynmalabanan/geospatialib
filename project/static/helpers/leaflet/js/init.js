const leafletMapHandlers = {
    container: (map) => {
        const container = map.getContainer()
        container.className = `${container.className} z-1 ${getLeafletMapDataset(map).mapClass || ''}`
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        
        Object.values(leafletMapHandlers).forEach(handler => handler(map))

        map._initComplete = true
        map.fire('mapInitComplete')
    })
})