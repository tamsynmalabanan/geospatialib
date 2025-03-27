const getLeafletGeoJSONLayer = async ({
    pane = 'overlayPane',
    geojson,
    customStyleParams,
    title,
    attribution,
    group,
    dataFetcher,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        // filter: (feature) => {
        //     return true
        // },
        pane,
        renderer: new L.SVG({pane}),
        markersInheritOptions: true,
    })

    if (title) geojsonLayer._title = title
    if (attribution) geojsonLayer._attribution = attribution
    if (group) geojsonLayer._group = group

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const properties = feature.properties
        
        layer.options.pane = geojsonLayer.options.pane
        
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

        layer.on('contextmenu', (e) => getLeafletLayerContextMenu(
            e.originalEvent, layer, {
                geojson: geojson || layer.toGeoJSON(),
            }
        ))
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
    
    geojsonLayer._renderers = {
        svg: new L.SVG({pane:geojsonLayer.options.pane}),
        canvas: new L.Canvas({pane:geojsonLayer.options.pane}),
    }
    // geojsonLayer.options.renderer = geojsonLayer._renderers.svg

    const data = dataFetcher ? await dataFetcher() : geojson
    if (data) geojsonLayer.addData(data)

    // geojsonLayer.on('rendererupdated', async (e) => {
    //     const newRenderer = geojsonLayer._renderers[e.renderer]
    //     geojsonLayer.options.renderer = newRenderer
    //     console.log(geojsonLayer.options.renderer)
        
    //     geojsonLayer.clearLayers()
    //     const data = await dataFetcher()
    //     if (data) geojsonLayer.addData(data)

    //     Object.keys(geojsonLayer._renderers).forEach(k => {
    //         geojsonLayer._renderers[k]._container
    //         .classList.toggle('d-none', k !== e.renderer)
    //     })

    //     geojsonLayer.fire('dataupdate')
    // })

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
                    html: leafletLayerStyleToHTML(
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

const createGeoJSONLayerLegend = (layer, parent) => {
    const table = document.createElement('table')
    table.id = `${parent.id}-table`
    table.className = removeWhitespace(`
        table table-sm table-borderless
        table-${getPreferredTheme()}
        align-middle m-0
    `)
    parent.appendChild(table)

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)

    const styles = getGeoJSONLayerStyles(layer)
    for (const id in styles) {
        const style = styles[id]
        
        const tr = document.createElement('tr')
        tr.id = `${table.id}-${id}`
        tr.className = 'd-flex flex-nowrap'
        tbody.appendChild(tr)

        const icon = document.createElement('td')
        icon.className = 'd-flex flex-no-wrap gap-2 align-items-center'
        tr.appendChild(icon)

        const totalCount = formatNumberWithCommas(
            Object.values(style.types)
            .map(type => type.count || 0)
            .reduce((a, b) => a + b, 0)
        )
        const label = document.createElement('td')
        label.appendChild(createSpan(
            style.label ? `${style.label} ` : '', 
            {id:`${tr.id}-title`})
        )
        label.appendChild(createSpan(
            `(${totalCount})`, 
            {id:`${tr.id}-count`}
        ))
        tr.appendChild(label)

        for (const type in style.types) {
            const typeCount = style.types[type].count
            if (!typeCount) continue
            
            const typeIcon = document.createElement('div')
            typeIcon.className = 'd-flex align-items-center'
            typeIcon.style.height = '10px'
            typeIcon.style.width = type === 'point' ? '10px' : '16px'
            typeIcon.innerHTML = style.types[type].html
            titleToTooltip(typeIcon, `${formatNumberWithCommas(typeCount)} ${type}${typeCount > 1 ? 's' : ''}`)
            icon.appendChild(typeIcon) 
        }
    }
}