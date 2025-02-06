const mapQuerySelector = (selector) => {
    let map

    if (window.maps) {
        window.maps.forEach(currentMap => {
            if (currentMap.getContainer().matches(selector)) {
                map = currentMap
                return
            }
        })
    }

    return map
}

const disableMapInteractivity = (map) => {
    map.dragging.disable()
    map.touchZoom.disable()
    map.doubleClickZoom.disable()
    map.scrollWheelZoom.disable()
}

const enableMapInteractivity = (map) => {
    map.dragging.enable()
    map.touchZoom.enable()
    map.doubleClickZoom.enable()
    map.scrollWheelZoom.enable()
}

const clearAllLayers = (map) => {
    map.eachLayer(layer => {
        if (layer._url === "//tile.openstreetmap.org/{z}/{x}/{y}.png") return

        if (Object.values(map.getLayerGroups()).includes(layer)) return

        map.removeLayer(layer);
    });        
}

const getMeterScale = (map) => {
    let scaleValue

    const scales = map.getContainer().querySelectorAll('.leaflet-control-scale-line')
    scales.forEach(scale => {
        const text = scale.innerText
        const lastChar = text.charAt(text.length - 1)
        if (lastChar === 'm') {
            const value = parseInt(text)
            if (text.includes('km')) {
                scaleValue = value * 1000
            } else {
                scaleValue = value
            }
            return
        }
    })

    return scaleValue
}

const getMapBbox = (map) => {
    const bounds = loopThroughCoordinates(
        map.getBounds(), 
        validateCoordinates
    )
    
    return [
        bounds.getNorth(),
        bounds.getEast(),
        bounds.getSouth(),
        bounds.getWest(),
    ]
}

const disableLayerClick = (map) => {
    map.eachLayer(layer => {
        const clickFns = layer._events.click
        if (layer.off && clickFns) {
            layer.disabledClickFns = clickFns
            layer.off('click')
        }
    });
}

const enableLayerClick = (map) => {
    map.eachLayer(layer => {
        const clickFns = layer.disabledClickFns
        if (layer.on && clickFns) {
            layer._events.click = clickFns
            delete layer.disabledClickFns
        }
    });
}

const zoomMapToBbox = (map, bbox) => {
    if (typeof bbox === 'string') {
        bbox = bbox.replace('(', '[').replace(')', ']')
        bbox = JSON.parse(bbox)
    }

    const [minX, minY, maxX, maxY] = bbox
    const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
    map.fitBounds(bounds)

    return bounds
}

const mapZoomToMeter = (map) => {
    return {
        20: 5,
        19: 10,
        18: 30,
        17: 50,
        16: 100,
        15: 200,
        14: 500,
        13: 1000,
        12: 2000,
        11: 3000,
        10: 5000,
        9: 10000,
        8: 30000,
        7: 50000,
        6: 100000,
        5: 200000,
        4: 500000,
        3: 1000000,
        2: 3000000,
        1: 5000000,
    }[map.getZoom()]
}