const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    styleParams,
    title,
    attribution,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        filter: (feature) => {
            return true
        },
        markersInheritOptions: true,
    })
    
    if (title) geojsonLayer._title = title
    if (attribution) geojsonLayer._attribution = attribution

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
 
    geojsonLayer._legend = {
        // groups: {
        //     'Title': {
        //         validators: [
        //             (feature) => ['property', 'values'].contains(feature.properties['key'])
        //             // array of functions that return true or false
        //         ],
        //         style: (feature) => getLeafletLayerStyle(feature.geometry.type, {
        //             customStyleParams: 'here'
        //         })
        //     },
        // },
        default: {
            label: null,
            style: (feature) => {
                return getLeafletLayerStyle(
                    feature.geometry.type, 
                    getLeafletStyleParams(styleParams)
                )
            }
        }
    }

    const getStyle = (feature) => {
        const legend = geojsonLayer._legend
        if (legend?.groups) {
            for (const groupTitle in legend.groups) {
                const group = legend.groups[groupTitle]
                let valid = true
                for (const validator in group.validators) {
                    if (!validator(feature)) {
                        valid = false
                        break
                    }
                }
                if (valid) {
                    feature._groupTitle = groupTitle
                    return group.style(feature)
                }
            }
        }
        feature._groupTitle = legend?.default?.label || ''
        return legend?.default?.style(feature) || getLeafletLayerStyle(
            feature.geometry.type, 
            getLeafletStyleParams(styleParams)
        )
    }

    geojsonLayer.options.style = (feature) => {
        return getStyle(feature)
    }
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