const getLeafletGeoJSONLayer = async ({
    geojson,
    group,
    pane = 'overlayPane',
    title = '',
    attribution = '',
    fetchParams,
    styles,
    customStyleParams,
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pane,
        renderer: new L.SVG({pane}),
        markersInheritOptions: true,
    })

    geojsonLayer._title = title
    geojsonLayer._attribution = attribution
    geojsonLayer._group = group
    geojsonLayer._renderers = [geojsonLayer.options.renderer, new L.Canvas({pane})]
    geojsonLayer._fetchParams = fetchParams || (geojson ? {id: generateRandomString(), geojson} : null)
    geojsonLayer._styles = styles || {
        symbology: {
            default: {
                label: '',
                rank: 1,
                showCount: true,
                showLabel: true,
                styleParams: getLeafletStyleParams(customStyleParams),
            },
            method: 'uniform',
            groupBy: [],
        },                                  
        visibility: {
            active: false,
            min: 10,
            max: 5000000,
        },
        filters: {
            type: {active: false, values: {
                Point: true,
                MultiPoint: true,
                LineString: true,
                MultiLineString: true,
                Polygon: true,
                MultiPolygon: true,
            }},
            geom: {active: false, values: {}},
            properties: {active: false, values: {}},
        }
    }

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const handler = (layer) => {
            layer.options.pane = geojsonLayer.options.pane
            
            if (assignFeatureLayerTitle(layer)) layer.bindTooltip(layer._title, {sticky:true})
            
            const properties = feature.properties
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
    
            layer.on('contextmenu', (e) => getLeafletLayerContextMenu(e.originalEvent, layer))
        }

        const renderer = geojsonLayer.options.renderer
        const isCanvas = renderer instanceof L.Canvas
        const styleParams = getStyle(feature)
        if (isCanvas 
            && styleParams.fillPattern !== 'solid' 
            && turf.getType(feature).endsWith('Polygon')
            && document.querySelector(`#${styleParams.fillPatternId}-img`)
            ?.getAttribute('src')
        ) {
            layer.once('add', () => {
                geojsonLayer.removeLayer(layer)
                const poly = L.polygon(
                    layer.getLatLngs(), 
                    getLeafletLayerStyle(feature, styleParams, {renderer})
                )
                poly.feature = feature
                handler(poly)
                poly.addTo(geojsonLayer)
            })
        } else {
            handler(layer)
        }
    }

    const getStyle = (feature) => {
        const symbology = geojsonLayer._styles?.symbology
        
        let styleParams = symbology?.default?.styleParams || getLeafletStyleParams()
        feature._groupId = ''
        
        if (symbology?.groups) {
            const groups = Object.entries(symbology.groups).sort(([keyA, valueA], [keyB, valueB]) => {
                return valueA.rank - valueB.rank
            })

            for (const [id, group] of groups) {
                if (!validateGeoJSONFeature(feature, group.filters)) continue
                
                feature._groupId = id
                styleParams = group.styleParams
                break
            }
        }

        return styleParams
    }

    geojsonLayer.options.style = (feature) => {
        const styleParams = getStyle(feature)
        const isCanvas = geojsonLayer.options.renderer instanceof L.Canvas
        if (isCanvas 
            && styleParams.fillPattern !== 'solid' 
            && turf.getType(feature).endsWith('Polygon')
            && document.querySelector(`#${styleParams.fillPatternId}-img`)
            ?.getAttribute('src')
        ) return
        return getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
    }

    geojsonLayer.options.pointToLayer = (feature, latlng) => {
        const styleParams = getStyle(feature)
        const icon = getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
        return icon instanceof L.DivIcon ? L.marker(latlng, {icon}) : L.circleMarker(latlng, icon)
    }
    
    if (geojson && !group?._map?._legendLayerGroups.includes(group)) {
        const filters = geojsonLayer._styles.filters
        if (Object.values(filters).some(i => i.active)) {
            geojson.features = geojson.features.filter(feature => {
                return validateGeoJSONFeature(feature, filters)
            })
        }
        sortGeoJSONFeaturesByType(geojson, {reverse:true})
        geojsonLayer.addData(geojson)
    }

    return geojsonLayer
}

const validateGeoJSONFeature = (feature, filters) => {
    if (filters.type.active) {
        if (!filters.type.values[feature.geometry.type]) return false
    }
    
    if (filters.properties.active) {
        const propertyFilters = Object.values(filters.properties.values)
        .filter(i => i.active && i.property && i.values?.length)

        if (!propertyFilters.every(i => {
            const handler = relationHandlers(i.handler)
            if (!handler) return true

            const value = (() => {
                const value = removeWhitespace(String(feature.properties[i.property] ?? '[undefined]'))
                return value === '' ? '[blank]' : value
            })()
            
            try {
                return i.values.some(v => handler(value, v, {caseSensitive:i.case}) === i.value)
            } catch (error) {
                return !i.value
            }
        })) return false
    }
        
    if (filters.geom.active) {
        const geomFilters = Object.values(filters.geom.values)
        .filter(i => i.active && i.geoms?.length && i.geoms.every(g => turf.booleanValid(g)))
        
        if (!geomFilters.every(i => {
            const handler = turf[i.handler]
            if (!handler) return true

            try {
                return i.geoms.some(g => handler(feature.geometry, g) === i.value)
            } catch {
                return !i.value
            }
        })) return false
    }

    return true
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
    const symbology = layer._styles.symbology
    layer.eachLayer(featureLayer => {
        const feature = featureLayer.feature
        const featureType = feature.geometry.type.toLowerCase()
        const type = featureType.split('multi')[featureType.split('multi').length-1]
        
        const groupId = feature._groupId
        const group = styles[groupId]
        
        if (group) {
            group.types[type].count +=1
        } else {
            const featureLegend = (symbology.groups?.[groupId]) || symbology.default 
            const styleParams = featureLegend.styleParams
            styles[groupId] = {
                label: featureLegend.label || '',
                showCount: featureLegend.showCount,
                showLabel: featureLegend.showLabel,
                rank: featureLegend.rank,
                types: {}
            }
            Array('point', 'linestring', 'polygon').forEach(typeName => {
                styles[groupId].types[typeName] = {
                    count: 0,
                    html: leafletLayerStyleToHTML(
                        getLeafletLayerStyle({
                            properties: styleParams.iconType === 'property' ? {
                                [styleParams.iconSpecs]:styleParams.iconSpecs
                            } : {},
                            geometry: {type:typeName}
                        }, styleParams),
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
    const fetchParams = layer._fetchParams
    if (!fetchParams) return

    const fetcher = fetchParams.geojson ? filterGeoJSON : null
    if (!fetcher) return

    const data = await fetcher(fetchParams.id, fetchParams.geojson, {
        map: layer._group?._map,
        controller,
    })

    const filters = layer._styles.filters
    if (data?.features?.length && Object.values(filters).some(i => i.active)) {
        data.features = data.features.filter(feature => {
            return validateGeoJSONFeature(feature, filters)
        })
    }

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
    if (data) {
        sortGeoJSONFeaturesByType(data, {reverse:true})
        layer.addData(data)
    }
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

    const styles = Object.entries(getGeoJSONLayerStyles(layer)).sort(([keyA, valueA], [keyB, valueB]) => {
        return valueA.rank - valueB.rank
    })
  
    for (const [id, style] of styles) {
        const tr = document.createElement('tr')
        tr.id = `${table.id}-${id}`
        tr.className = 'd-flex flex-nowrap align-items-center'
        tbody.appendChild(tr)

        const icon = document.createElement('td')
        icon.className = 'd-flex flex-no-wrap gap-2 align-items-center justify-content-end'
        tr.appendChild(icon)

        const totalCount = formatNumberWithCommas(
            Object.values(style.types)
            .map(type => type.count || 0)
            .reduce((a, b) => a + b, 0)
        )
        const label = document.createElement('td')
        label.className = `d-flex gap-2`
        label.appendChild(createSpan(
            style.label ? `${style.label} ` : '', {
                id:`${tr.id}-title`,
                className: `${!style.showLabel ? 'd-none' : ''}`
            })
        )
        label.appendChild(createSpan(
            `(${totalCount})`, {
                id:`${tr.id}-count`,
                className: `${!style.showCount ? 'd-none' : ''}`
            }
        ))
        tr.appendChild(label)

        for (const type in style.types) {
            const typeCount = style.types[type].count
            if (!typeCount) continue
            
            const typeIcon = document.createElement('div')
            typeIcon.className = 'd-flex align-items-center justify-content-center'

            const isPoint = type === 'point'
            typeIcon.style[isPoint ? 'minHeight' : 'height'] = '14px'
            typeIcon.style[isPoint ? 'minWidth' : 'width'] = '20px'

            typeIcon.innerHTML = style.types[type].html
            titleToTooltip(typeIcon, `${formatNumberWithCommas(typeCount)} ${type}${typeCount > 1 ? 's' : ''}`)
            icon.appendChild(typeIcon) 
        }
    }

    const iconTds = Array.from(tbody.querySelectorAll('tr')).map(i => i.firstChild)
    const maxWidth = Math.max(...iconTds.map(i => i.offsetWidth))
    iconTds.forEach(i => i.style.minWidth = `${maxWidth}px`)
}  