const leafletZoomToMeter = (zoom) => {
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
    }[zoom]
}

const isLeafletControlElement = (element) => {
    return element.classList.contains('leaflet-control') || element.closest('.leaflet-control')
}