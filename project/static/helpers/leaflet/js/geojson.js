const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    altStyleParams,
} = {}) => {
    const styleParams = getLeafletStyleParams(altStyleParams)
    
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        style: (feature) => {
            return getLeafletLayerStyle(feature.geometry.type, styleParams)
        },
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                icon: getLeafletLayerStyle('point', styleParams)
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
