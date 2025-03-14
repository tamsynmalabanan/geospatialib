const disableMapInteractivity = (map) => {
    if (!map._enabledInteractivity || map._enabledInteractivity === true) {
        map.dragging.disable()
        map.touchZoom.disable()
        map.doubleClickZoom.disable()
        map.scrollWheelZoom.disable()
        map._enabledInteractivity = false
    }
}

const enableMapInteractivity = (map) => {
    if (map._enabledInteractivity === false) {
        map.dragging.enable()
        map.touchZoom.enable()
        map.doubleClickZoom.enable()
        map.scrollWheelZoom.enable()
        map._enabledInteractivity = true
    }
}

const getLeafletMeterScale = (map) => {
    const scales = map.getContainer().querySelectorAll('.leaflet-control-scale-line')
    for (const scale of scales) {
        const text = scale.innerText
        const lastChar = text?.charAt(text.length - 1)
        if (lastChar === 'm') {
            const value = parseInt(text)
            return text.includes('km') ? (value * 1000) : value
        }
    }
}