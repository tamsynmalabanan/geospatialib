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
        const properties = feature.properties
        layer.options.pane = geojsonLayer.options.pane || layer.options.pane
        if (assignFeatureLayerTitle(layer)) layer.bindTooltip(layer._title, {sticky:true})

        if (Object.keys(properties).length) {
            const createPopup = () => {
                const propertiesTable = createFeaturePropertiesTable(properties, {
                    header: (() => {
                        const popupHeader = () => [geojsonLayer, layer].map(i => i._title).filter(i => i).join(': ')
                        layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = popupHeader())
                        return popupHeader()
                    })()
                })
                propertiesTable.style.maxWidth = '100%'
                
                layer.bindPopup(propertiesTable.outerHTML, {
                    autoPan: false,
                }).openPopup()
                
                layer.off('click', createPopup)
            }

            layer.on('click', createPopup)
        }
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
    
    if (geojson) geojsonLayer.addData(geojson)

    return geojsonLayer
}

const assignFeatureLayerTitle = (layer) => {
    const properties = layer.feature.properties

    for (const key of [
        'display_name',
        'name:en',
        'name',
        'feature_id',
        'type',
    ]) {
        const matches = Object.keys(properties).filter(i => i === key || i.startsWith(key))
        if (!matches.length) {
            continue
        } else {
            layer._title = properties[matches[0]]
            break
        }
    }

    if (!layer._title) {
        for (const key in properties) {
            const value = properties[key]
            if (typeof value !== 'object' && value.length < 50) {
                layer._title = `${key}: ${value}`
                break
            }
        }
    }

    return layer._title
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