const handleLeafletMapContainer = async (map) => {
    const container = map.getContainer()
    const dataset = container.parentElement.dataset

    container.className = `bg-${getPreferredTheme()} ${container.className} ${dataset.mapClass ?? ''}`

    elementResizeObserver(container, () => map.invalidateSize())
}

const handleLeafletMapBasemap = async (map) => {
    L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: `layer-${getPreferredTheme()}`,
        maxZoom: 20,
    }).addTo(map)
}

const handleLeafletMapEvents = async (map) => {
    map.on('popupopen', (e) => {
        e.popup._container.querySelector('.leaflet-popup-content-wrapper').style.maxHeight = `${map.getSize().y * 0.5}px`
    })
}

window.addEventListener("map:init", async (e) => {
    const map = e.detail.map

    handleLeafletMapContainer(map)
    handleLeafletMapBasemap(map)
    handleLeafletLayerGroups(map)
    handleLeafletMapPanels(map)
    handleLeafletMapControls(map)
    handleLeafletMapEvents(map)

    map._featureSelector = false
    map._featureSelectorLayer = L.geoJSON()
    map._featureSelectionCoords = []

    map._initComplete = true
    map.fire('initComplete')
})