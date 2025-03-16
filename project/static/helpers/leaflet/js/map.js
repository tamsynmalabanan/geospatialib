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

// const disableLayerClick = (map) => {
//     map.eachLayer(layer => {
//         const clickFns = layer._events.click
//         if (!layer.off || !clickFns) return
//         layer._disabledClickFns = clickFns
//         layer.off('click')
//     })
// }

// const enableLayerClick = (map) => {
//     map.eachLayer(layer => {
//         const clickFns = layer.disabledClickFns
//         if (layer.on && clickFns) {
//             layer._events.click = clickFns
//             delete layer.disabledClickFns
//         }
//     });
// }

const disableLeafletLayersInteractivity = (map) => {
    map.eachLayer(layer => layer.options.interactive = false)
    const disableLeafletLayersInteractivityHandler = (e) => e.layer.options.interactive = false
    map.on('layeradd', disableLeafletLayersInteractivityHandler)
}

const enableLeafletLayersInteractivity = (map) => {
    map.eachLayer(layer => layer.options.interactive = true)
    map._events.layeradd = map._events.layeradd?.filter(handler => {
        return handler.fn.name !== 'disableLeafletLayersInteractivityHandler'
    })
}