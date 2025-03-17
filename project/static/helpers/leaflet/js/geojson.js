const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    styleParams,
    title,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        filter: (feature) => {
            return true
        },
        markersInheritOptions: true,
    })
    
    if (title) geojsonLayer._title = title

    geojsonLayer.options.pane = pane || geojsonLayer.options.pane
    
    geojsonLayer.options.onEachFeature = (feature, layer) => {
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
        
        const properties = feature.properties
        if (feature.id) properties.feature_id = feature.id

        const keywords = [
            'display_name',
            'name',
            'feature_id',
            'type',
        ]

        for (const key of keywords) {
            const matches = Object.keys(properties).filter(i => i.startsWith(key))
            if (!matches) {
                continue
            } else {
                layer._title = properties[matches[0]]
                break
            }
        }

        if (!layer._title) {
            for (const key in properties) {
                const value = properties[key]
                if (typeof value !== 'object' && value.length < 50 && value.length > 5) {
                    layer._title = `${key}: ${value}`
                    break
                }
            }
        }

        if (!layer.title) console.log(properties)
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
    }
    
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