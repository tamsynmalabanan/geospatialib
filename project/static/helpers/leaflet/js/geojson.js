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
        // filter: (geoJsonFeature) => {
        //     return true
        // },
        markersInheritOptions: true,
    })

    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
    }

    // geojsonLayer.options.symbology = {
    //     grouped: false,
    //     gruops: {
    //         'Title': {
    //             properties: {
    //                 'property key': ['property', 'values'],
    //             },
    //             style: (feature) => {
    //                 const type = feature.geometry.type
    //                 const style = getLeafletLayerStyle(type, options)
    //                 return type.toLowerCase().endsWith('point') ? L.marker(
    //                     [...feature.geometry.coordinates.reverse()], {
    //                         icon: style                            
    //                     }
    //                 ) : style
    //             }
    //         },
    //         'Others': {
    //             style: (feature) => {
    //                 const type = feature.geometry.type
    //                 const style = getLeafletLayerStyle(type, options)
    //                 return type.toLowerCase().endsWith('point') ? L.marker(
    //                     [...feature.geometry.coordinates.reverse()], {
    //                         icon: style                            
    //                     }
    //                 ) : style
    //             }
    //         }
    //     }
    // }

    if (geojson) geojsonLayer.addData(geojson)

    return geojsonLayer
}