const getLeafletGeoJSONLayer = async ({
    geojson,
    pane = 'overlayPane',
    customStyleParams,
    title = '',
    attribution = '',
    group,
    fetcher,
    styles,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pane,
        renderer: new L.SVG({pane}),
        markersInheritOptions: true,
    })

    geojsonLayer._title = title
    geojsonLayer._attribution = attribution
    
    geojsonLayer._group = group
    const map = group?._map
    const isLegendGroup = map._legendLayerGroups.includes(group)

    if (!fetcher && geojson) {
        const cacheId = generateRandomString()
        // cache geojson in indexdb with _queryExtent = geojson bbox -- 
        // use turf.area to determinse if its needs buffer to be polygon, shorter expiration
        // remove geojson from fetchGeoJSONInMap fn

        fetcher = fetchStaticGeoJSON = async ({map, controller}={}) => {
            if (!map) return geojson
            return await fetchGeoJSONInMap(geojson, cacheId, map, {controller})
        }
    }
    geojsonLayer._fetcher = fetcher

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const properties = feature.properties
        
        layer.options.pane = geojsonLayer.options.pane
        
        if (assignFeatureLayerTitle(layer)) layer.bindTooltip(layer._title, {sticky:true})

        if (Object.keys(properties).length) {
            layer.bindPopup(createFeaturePropertiesTable(properties, {
                header: (() => {
                    const popupHeader = () => [geojsonLayer, layer].map(i => i._title).filter(i => i).join(': ')
                    layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = popupHeader())
                    return popupHeader()
                })()
            }).outerHTML, {
                autoPan: false,
            })
        }

        layer.on('contextmenu', (e) => getLeafletLayerContextMenu(
            e.originalEvent, layer
        ))
    }
 
    geojsonLayer._styles = styles || {
        // groups: {
        //     id: {
        //         label: 'Label',
        //         rank: 1,
        //         validators: [
        //             (feature) => ['property', 'values'].contains(feature.properties['key'])
        //             // array of functions that return true or false - refine this, not functions, just
        //             // field: type {range/category} values
        //         ],
        //         styleParams: {

        //         }, // getLeafletLayerStyle(feature.geometry.type, styleParams)
        //     },
        // },
        default: {
            label: '',
            styleParams: getLeafletStyleParams(customStyleParams),
        },
        method: 'uniform',
        visibility: {
            min: 10,
            max: 5000000,
        },
        filters: {
            '__type__': {
                active: false,
                inclusions: ['MultiPolygon'],
                exclusions: [],
            },
            '__geom__': {
                active: false,
                inclusions: [],
                exclusions: ['{"type":"Polygon","coordinates":[[[77.4240854,28.6192734],[77.4239929,28.6189705],[77.4237033,28.6185648],[77.4231857,28.6182511],[77.4240237,28.6169312],[77.4250405,28.6174181],[77.4256699,28.6164021],[77.4259618,28.6159057],[77.4259402,28.6158439],[77.4279983,28.6167744],[77.4265502,28.6191707],[77.4254349,28.6192194],[77.4241223,28.6193438],[77.4240854,28.6192734]]]}'],
            },
            'access': {
                active: false,
                inclusions: [],
                exclusions: ['private'],
            },
        }
    }

    geojsonLayer.options.filter = (feature) => {
        const filters = geojsonLayer._styles.filters//.sort((a, b) => a.rank - b.rank)
        for (const property in filters) {
            const filter = filters[property]
            if (!filter.active) continue
            
            const inclusions = filter.inclusions
            const exclusions = filter.exclusions
            
            if (property === '__geom__') {
                if (inclusions.length && !inclusions.some(i => {
                    const filterFeature = JSON.parse(i)
                    if (!turf.booleanValid(filterFeature)) return true
                    return turf.booleanIntersects(filterFeature, feature)
                })) return false
                
                if (exclusions.length && exclusions.some(i => {
                    const filterFeature = JSON.parse(i)
                    if (!turf.booleanValid(filterFeature)) return false
                    return turf.booleanIntersects(filterFeature, feature)
                })) return false
            } else {
                const value = property === '__type__' ? feature.geometry.type : feature.properties[property] || 'null'
                if (inclusions.length && !inclusions.includes(value)) return false
                if (exclusions.length && exclusions.includes(value)) return false
            }
        }

        return true
    }

    const getStyle = (feature, {circleMarker=false}={}) => {
        const styles = geojsonLayer._styles
        
        let styleParams = styles?.default?.styleParams || getLeafletStyleParams()
        feature._groupId = ''
        
        if (styles?.groups) {
            for (const id in styles.groups) {
                const group = styles.groups[id]
                let valid = true
                
                for (const validator in group.validators) {
                    if (!validator(feature)) {
                        valid = false
                        break
                    }
                }

                if (valid) {
                    feature._groupId = id
                    styleParams = group.styleParams
                }
            }
        }

        const circlePolygon = circleMarker && styleParams.iconClass === 'circle-fill' && !styleParams.iconShadow && !styleParams.iconGlow
        const type = circlePolygon ? 'Polygon' : feature.geometry.type
        const layerStyle =  getLeafletLayerStyle(type, styleParams)
        
        if (circlePolygon) {
            layerStyle.radius = styleParams.iconSize/2 
            delete layerStyle.dashArray
            delete layerStyle.dashOffset
        }
        
        return layerStyle
    }

    geojsonLayer.options.style = (feature) => getStyle(feature)
    geojsonLayer.options.pointToLayer = (feature, latlng) => {
        const renderer = geojsonLayer.options.renderer
        const isCanvas = renderer instanceof L.Canvas
        const styleParams = getStyle(feature, {circleMarker:isCanvas})

        return isCanvas && styleParams.radius ? L.circleMarker(latlng, {
            ...styleParams,
            renderer,
        }) : L.marker(latlng, {icon: styleParams})
    }
    
    geojsonLayer._renderers = [
        geojsonLayer.options.renderer,
        new L.Canvas({pane})
    ]

    if (geojson && !isLegendGroup) geojsonLayer.addData(geojson)

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
    const layerStyles = layer._styles
    layer.eachLayer(featureLayer => {
        const feature = featureLayer.feature
        const featureType = feature.geometry.type.toLowerCase()
        const type = featureType.split('multi')[featureType.split('multi').length-1]
        
        const groupId = feature._groupId
        const group = styles[groupId]
        
        if (group) {
            group.types[type].count +=1
        } else {
            const featureLegend = layerStyles.groups && layerStyles.groups[groupId] ? layerStyles.groups[groupId] : layerStyles.default 
            const styleParams = featureLegend.styleParams
            styles[groupId] = {
                label: featureLegend.label || '', 
                types: {}
            }
            Array('point', 'linestring', 'polygon').forEach(typeName => {
                styles[groupId].types[typeName] = {
                    count: 0,
                    html: leafletLayerStyleToHTML(
                        getLeafletLayerStyle(typeName, styleParams),
                        typeName
                    )
                }
            })
            styles[groupId].types[type].count +=1
        }
    })

    return styles
}

const updateGeoJSONData = async (layer, {controller} = {}) => {
    const data = layer._fetcher ? await layer._fetcher({
        map: layer._group?._map,
        controller,
    }) : null

    const renderer = (data?.features?.length || 0) > 1000 ? L.Canvas : L.SVG
    if (layer.options.renderer instanceof renderer === false) {
        layer.options.renderer._container?.classList.add('d-none')
        layer.options.renderer = layer._renderers.find(r => {
            const match = r instanceof renderer
            return match
        })
    }

    layer.options.renderer._container?.classList.remove('d-none')

    layer.clearLayers()
    if (data) layer.addData(data)
    layer.fire('dataupdate')
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
        tr.className = 'd-flex flex-nowrap align-items-center'
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
        label.className = `d-flex gap-2`
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

            const isPoint = type === 'point'
            typeIcon.style[isPoint ? 'minHeight' : 'height'] = '14px'
            typeIcon.style[isPoint ? 'minWidth' : 'width'] = '20px'

            typeIcon.innerHTML = style.types[type].html
            titleToTooltip(typeIcon, `${formatNumberWithCommas(typeCount)} ${type}${typeCount > 1 ? 's' : ''}`)
            icon.appendChild(typeIcon) 
        }
    }
}