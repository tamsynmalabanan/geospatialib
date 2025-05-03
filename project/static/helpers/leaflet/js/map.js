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
    return leafletZoomToMeter(map.getZoom())
}

const scaleToLeafletZoom = (scale) => {
    const diff = {}
    for (i in leafletZoomToMeter()) {
        const value = leafletZoomToMeter(i)
        if (scale === value) return i
        diff[Math.abs(scale-value)] = i
    }
    return diff[Math.min(...Object.keys(diff))]
}

const zoomLeafletMapToScale = (map, scale) => {
    const mapZoom = map.getZoom()
    const mapScale = leafletZoomToMeter(mapZoom)

    const diff = {}
    if (mapScale > scale) {
        for (let i=mapZoom; i <= 20; i++) {
            diff[Math.abs(scale-leafletZoomToMeter(i))] = i
        }
    } else {
        for (let i=1; i <= mapZoom; i++) {
            diff[Math.abs(scale-leafletZoomToMeter(i))] = i
        }
    }

    let newZoom = diff[Math.min(...Object.keys(diff))]
    newZoom += newZoom > 15 ? 1 : 0
    map.setZoom(newZoom)

    return newZoom
}

const disableLeafletLayerClick = (map) => {
    map.eachLayer(layer => {
        const clickFns = layer._events.click
        if (!clickFns) return
        
        layer._disabledClickFns = clickFns
        delete layer._events.click
    });
}

const enableLeafletLayerClick = (map) => {
    map.eachLayer(layer => {
        const clickFns = layer._disabledClickFns
        if (!clickFns) return 
        
        layer._events.click = clickFns
        delete layer._disabledClickFns

    });
}

const assignMapObservers = (map) => {
    map.on('popupopen', (e) => {
        e.popup._container.querySelector('.leaflet-popup-content-wrapper').style.maxHeight = `${map.getSize().y * 0.5}px`
    })
}

const getLeafletMapBbox = (map) => {
    return loopThroughCoordinates(
        map.getBounds(), 
        validateLeafletLayerCoords
    ).toBBoxString().split(',') // w,s,e,n
}

const zoomLeafletMapToBounds = (map, bounds, {zoom=18}={}) => {
    const b = bounds
    if (!b) return
    
    if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
        return map.setView(b.getNorthEast(), zoom)
    } else {
        return map.fitBounds(b)
    }
}