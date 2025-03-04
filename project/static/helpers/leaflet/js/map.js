const disableMapInteractivity = (map) => {
    console.log('disble')
    map.dragging.disable()
    map.touchZoom.disable()
    map.doubleClickZoom.disable()
    map.scrollWheelZoom.disable()
}

const enableMapInteractivity = (map) => {
    console.log('enable')
    map.dragging.enable()
    map.touchZoom.enable()
    map.doubleClickZoom.enable()
    map.scrollWheelZoom.enable()
}