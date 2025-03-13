const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    styleParams,
} = {}) => {
    const options = getLeafletStyleParams(styleParams)
    
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        style: (feature) => {
            return getLeafletLayerStyle(feature.geometry.type, options)
        },
        pointToLayer: (feature, latlng) => {
            return L.marker(latlng, {
                icon: getLeafletLayerStyle('point', options)
            })
        },
        markersInheritOptions: true,
    })

    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
    }

    geojsonLayer.on('layeradd', (e) => {
        console.log(e.layer.options.icon)
    })
    
    geojsonLayer.on('layerremove', (e) => {
        console.log(e.layer.options.icon)
    })

    if (geojson) geojsonLayer.addData(geojson)

    return geojsonLayer
}
