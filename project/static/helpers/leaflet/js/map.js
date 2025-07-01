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
    if (!map) return 

    const meterScale = map._scaleBar?._mScale?.innerText
    if (meterScale) {
        const value = parseInt(meterScale)
        return meterScale.includes('km') ? (value * 1000) : value
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

const getLeafletMapBbox = (map) => {
    return loopThroughCoordinates(
        map.getBounds(), 
        validateLeafletLayerCoords
    ).toBBoxString().split(',') // w,s,e,n
}

const zoomLeafletMapToBounds = (map, bounds, {zoom=18}={}) => {
    const b = bounds
    if (!b) return
    
    try {
        if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
            return map.setView(b.getNorthEast(), zoom)
        } else {
            return map.fitBounds(b)
        }
    } catch (error) {
        return
    }
}
