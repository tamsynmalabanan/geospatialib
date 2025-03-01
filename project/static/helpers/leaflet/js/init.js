document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        const container = map.getContainer()
        const dataset = container.parentElement.dataset

        container.className = `${container.className} z-1 ${dataset.mapClass || ''}`
        elementResizeObserver(container, () => map.invalidateSize())

        map._initComplete = true
        map.fire('initComplete')
    })
})