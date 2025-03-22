const getLeafletGeoJSONLayer = ({
    pane,
    geojson,
    customStyleParams,
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
 
    const styleParams = getLeafletStyleParams(customStyleParams)
    geojsonLayer._legend = {
        // groups: {
        //     id: {
        //         label: 'Label
        //         validators: [
        //             (feature) => ['property', 'values'].contains(feature.properties['key'])
        //             // array of functions that return true or false
        //         ],
        //         style: (feature) => getLeafletLayerStyle(feature.geometry.type, {
        //             customStyleParams: 'here'
        //         }),
        //     },
        // },
        default: {
            label: '',
            style: (feature) => {
                return getLeafletLayerStyle(
                    feature.geometry.type, 
                    styleParams
                )
            }
        }
    }

    const getStyle = (feature) => {
        const legend = geojsonLayer._legend
        if (legend?.groups) {
            for (const id in legend.groups) {
                const group = legend.groups[id]
                let valid = true
                for (const validator in group.validators) {
                    if (!validator(feature)) {
                        valid = false
                        break
                    }
                }
                if (valid) {
                    feature._groupId = id
                    return group.style(feature)
                }
            }
        }
        feature._groupId = ''
        return legend?.default?.style(feature) || getLeafletLayerStyle(
            feature.geometry.type, 
            styleParams
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

const getGeoJSONLayerStyles = (layer) => {
    const styles = {}
    const layerLegend = layer._legend
    layer.eachLayer(featureLayer => {
        const feature = featureLayer.feature
        const featureType = feature.geometry.type.toLowerCase()
        const type = featureType.split('multi')[featureType.split('multi').length-1]
        
        const groupId = feature._groupId
        const group = styles[groupId]
        
        if (group) {
            group.types[type].count +=1
        } else {
            const featureLegend = layerLegend.groups && layerLegend.groups[groupId] ? layerLegend.groups[groupId] : layerLegend.default 
            const styleHandler = featureLegend.style
            styles[groupId] = {
                label: featureLegend.label || '', 
                types: {}
            }
            Array('point', 'linestring', 'polygon').forEach(typeName => {
                styles[groupId].types[typeName] = {
                    count: 0,
                    html: layerStyleToHTML(
                        styleHandler({geometry:{type:typeName}}),
                        typeName
                    )
                }
            })
            styles[groupId].types[type].count +=1
        }
    })

    return styles
}