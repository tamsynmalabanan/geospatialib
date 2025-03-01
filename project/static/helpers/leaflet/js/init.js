const containerHandler = (map) => {
    const container = map.getContainer()
    container.className = `${container.className} z-1 ${getMapDataset(map).mapClass || ''}`
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        
        containerHandler(map)

        map._initComplete = true
        map.fire('mapInitComplete')
    })
})