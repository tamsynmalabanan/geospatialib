const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    styleParams,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        filter: (feature) => {
            return true
        },
        markersInheritOptions: true,
    })
    
    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
    }
    
    const getStyle = (feature) => {
        const symbology = geojsonLayer.options.symbology
        if (symbology?.grouped) {
            for (const group in symbology.groups) {
                let valid = true

                for (const property in group.properties) {
                    const valueList = group.properties[property]
                    const featureValue = feature.properties[property]
                    if (!valueList.contains(featureValue)) {
                        valid = false
                        break
                    }
                }
    
                if (valid) return group.style(feature)
            }
    
            return symbology.default.style(feature)
        } else {
            return getLeafletLayerStyle(
                feature.geometry.type, 
                getLeafletStyleParams(styleParams)
            )
        }
    }

    geojsonLayer.options.style = (feature) => getStyle(feature)
    geojsonLayer.options.pointToLayer = (feature, latlng) => {
        return L.marker(latlng, {icon: getStyle(feature)})
    },
    
    // geojsonLayer.options.symbology = {
    //     grouped: false,
    //     groups: {
    //         'Title': {
    //             properties: {
    //                 'property key': ['property', 'values'],
    //             },
    //             style: (feature) => getLeafletLayerStyle(feature.geometry.type, {
    //                 customStyleParams: 'here'
    //             })
    //         },
    //     },
    //     default: {
    //         label: 'Others',
    //         style: (feature) => getLeafletLayerStyle(feature.geometry.type, {
    //             customStyleParams: 'here'
    //         })
    //     }
    // }

    if (geojson) geojsonLayer.addData(geojson)

    return geojsonLayer
}