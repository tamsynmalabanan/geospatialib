const leafletZoomToMeter = (zoom) => {
    const values = {
        20: 10,
        19: 20,
        18: 30,
        17: 50,
        16: 100,
        
        15: 300,
        14: 500,
        13: 1000,
        12: 2000,
        11: 5000,
        
        10: 10000,
        9: 20000,
        8: 30000,
        7: 50000,
        6: 100000,
        
        5: 300000,
        4: 500000,
        3: 1000000,
        2: 3000000,
        1: 5000000,
    }

    return zoom ? values[zoom] : values
}

const isLeafletControlElement = (element) => {
    return element.classList.contains('leaflet-control') || element.closest('.leaflet-control')
}

const createCustomPane = (map) => {
    if (!map) return 
    
    const paneName = `custom-${generateRandomString()}`
    map.getPane(paneName) || map.createPane(paneName)
    return paneName
}

const deletePane = (map, paneName) => {
    const pane = map.getPane(paneName)
    if (!pane) return
    
    L.DomUtil.remove(pane)
    delete map._panes[paneName]
    delete map._paneRenderers[paneName]
}