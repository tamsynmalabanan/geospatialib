const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    altStyleParams,
} = {}) => {
    const styleParams = getLeafletStyleParams(altStyleParams)
    
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        style: (feature) => {
            const pathStyleParams = Object.assign({}, styleParams)
            return getLeafletLayerStyle(feature.geometry.type, pathStyleParams)
        },
        pointToLayer: (feature, latlng) => {
            const ptStyleParams = Object.assign({}, styleParams)
            ptStyleParams.fillOpacity = 1
            return L.marker(latlng, {
                icon: getLeafletLayerStyle('point', ptStyleParams)
            })
        }
    })

    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
    }

    if (geojson) geojsonLayer.addData(geojson)

    return geojsonLayer
}
