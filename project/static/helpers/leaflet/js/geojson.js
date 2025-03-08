const getLeafletGeoJSONLayer = ({
    pane,
} = {}) => {
    const styleParams = getLeafletStyleParams()
    
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        style: (feature) => getLeafletLayerStyle(feature.geometry.type, styleParams),
        pointToLayer: (feature, latlng) => L.marker(latlng, {
            icon: getLeafletLayerStyle('point', styleParams)
        })
    })

    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
    }

    options.geojson && geojsonLayer.addData(options.geojson)

    return geojsonLayer
}
