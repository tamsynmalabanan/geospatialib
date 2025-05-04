const getLeafletGeoJSONLayer = async ({
    geojson,
    group,
    pane = 'overlayPane',
    title = '',
    attribution = '',
    geojsonId,
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

    const isQuery = group?._name === 'query'
    if (!isQuery) geojsonLayer._geojsonId = geojsonId || (
        geojson ? saveToGeoJSONDB(geojson, {normalize:true}) : null
    )

    geojsonLayer._styles = styles || {
        symbology: {
            default: {
                active: true,
                label: '',
                rank: 1,
                showCount: true,
                showLabel: true,
                styleParams: getLeafletStyleParams(customStyleParams),
            },
            case: true,
            method: 'single',
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
            geom: {
                active: false, 
                values: {},
                operator: '&&',
            },
            properties: {
                active: false, 
                values: {},
                operator: '&&',
            },
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
        return (symbology?.groups)?.[feature.properties.__groupId__]?.styleParams || symbology?.default?.styleParams || getLeafletStyleParams()
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
    
    if (geojson && isQuery) {
        addLeafletGeoJSONData(geojsonLayer, geojson, {
            queryGeom: L.rectangle(group._map.getBounds()).toGeoJSON().geometry
        })
    } else if (geojsonLayer._geojsonId && !isQuery) {
        geojsonLayer.on('popupopen', (e) => {
            geojsonLayer._openpopup = e.popup
        })
        
        geojsonLayer.on('popupclose', (e) => {
            delete geojsonLayer._openpopup 
        })

        geojsonLayer.on('add', () => {
            if (layerIsVisible(geojsonLayer)) {
                updateGeoJSONData(geojsonLayer)
            }
        })

        geojsonLayer.on('remove', () => {
            geojsonLayer.clearLayers()
        })
    }

    return geojsonLayer
}

const validateGeoJSONFeature = (feature, filters) => {
    if (filters.type.active && !filters.type.values[feature.geometry.type]) return false
    
    if (filters.properties.active) {
        const operator = filters.properties.operator
        const propertyFilters = Object.values(filters.properties.values)
        .filter(i => i.active && i.property && i.values?.length)

        const eval = (i) => {
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
        }

        if (operator === '&&' && !propertyFilters.every(i => eval(i))) return false
        if (operator === '||' && !propertyFilters.some(i => eval(i))) return false
    }
        
    if (filters.geom.active) {
        const operator = filters.geom.operator
        const geomFilters = Object.values(filters.geom.values)
        .filter(i => i.active && i.geoms?.length && i.geoms.every(g => turf.booleanValid(g)))
        
        const eval = (i) => {
            const handler = turf[i.handler]
            if (!handler) return true

            try {
                return i.geoms.some(g => handler(feature.geometry, g) === i.value)
            } catch {
                return !i.value
            }
        }

        if (operator === '&&' && !geomFilters.every(i => eval(i))) return false
        if (operator === '||' && !geomFilters.some(i => eval(i))) return false
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
    const symbology = layer._styles.symbology
    
    const styles = {}
    Array(...Object.keys(symbology.groups ?? {}), '').forEach(id => {
        const origStyle = symbology.groups?.[id] || symbology.default
        if (!origStyle.active) return

        const style = styles[id] = {
            ...origStyle,
            types: {}
        }

        let typeNames

        const styleTypeFilter = style.filters?.type
        if (styleTypeFilter?.active) {
            typeNames = [...new Set(Object.keys(styleTypeFilter.values).filter(i => {
                return styleTypeFilter.values[i]
            }))]
        } else {
            const layerTypeFilter = layer._styles.filters.type
            if (layerTypeFilter.active) {
                typeNames = [...new Set(Object.keys(layerTypeFilter.values).filter(i => {
                    return layerTypeFilter.values[i]
                }))]
            }
        }
        
        typeNames = typeNames?.map(i => i.toLowerCase().replace('multi', '')) || Array('point', 'linestring', 'polygon')

        const styleParams = style.styleParams
        typeNames.forEach(typeName => {
            style.types[typeName] = {
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
    })

    layer.eachLayer(featureLayer => {
        const feature = featureLayer.feature
        const featureType = feature.geometry.type.toLowerCase()
        styles[feature.properties.__groupId__ ?? ""].types[featureType.split('multi')[featureType.split('multi').length-1]].count +=1
    })

    Object.keys(styles).forEach(i => {
        const style = styles[i]
        const totalCount = Object.values(style.types).map(type => type.count || 0).reduce((a, b) => a + b, 0)
        i === '' && totalCount === 0 && Object.keys(styles).length > 1 ? delete styles[i] : style.totalCount = totalCount
    })

    const typesString = [...new Set(Object.values(styles).map(i => Object.keys(i.types).filter(j => i.types[j].count > 0).join(',')))]
    if (typesString.length === 1) {
        const types = typesString[0].split(',')
        Object.keys(styles).forEach(i => {
            const style = styles[i]
            Object.keys(style.types).forEach(j => {
                if (!types.includes(j) && !style.types[j].count) delete style.types[j]
            })
        })
    }

    return styles
}

// web worker this
const addLeafletGeoJSONData = (layer, data, {queryGeom, controller}={}) => {
    if (data instanceof Error) return layer.fire('dataerror')

    if (controller?.signal.aborted) return

    const map = layer._group._map
    const queryExtent = queryGeom ? turf.getType(queryGeom) === 'Point' ? turf.buffer(
        queryGeom, getLeafletMeterScale(map)/2/1000
    ).geometry : queryGeom : null

    const filters = layer._styles.filters
    const groups = Object.entries((layer._styles.symbology.groups ?? {})).sort(([keyA, valueA], [keyB, valueB]) => {
        return valueA.rank - valueB.rank
    })

    data.features = (data.features ?? []).filter(feature => {
        const valid = (
            (queryExtent ? turf.booleanIntersects(queryExtent, feature) : true) 
            && validateGeoJSONFeature(feature, filters)
        )

        if (valid && groups.length) {
            const properties = feature.properties
            for (const [id, group] of groups) {
                if (!group.active || !validateGeoJSONFeature(feature, group.filters ?? {})) continue
                properties.__groupId__ = id
                properties.__groupRank__ = group.rank
                break
            }

            if (!properties.__groupId__) properties.__groupId__ = ''
            if (!properties.__groupRank__) properties.__groupRank__ = groups.length + 1
        }
    
        return valid
    })

    sortGeoJSONFeatures(data, {reverse:true})

    if (layer._group._name !== 'query') {
        // simplify / cluster if not query // reconfigure legend feature count
        
        const renderer = (data?.features?.length ?? 0) > 1000 ? L.Canvas : L.SVG
        if (layer.options.renderer instanceof renderer === false) {
            layer.options.renderer._container?.classList.add('d-none')
            layer.options.renderer = layer._renderers.find(r => {
                const match = r instanceof renderer
                if (match) r._container?.classList.remove('d-none')
                return match
            })
        }
    }

    if (controller?.signal.aborted) return

    layer.clearLayers()
    layer.addData(data)
    return layer.fire('dataupdate')
}

const mapForUpdateGeoJSONData = new Map()
const updateGeoJSONData = async (layer, {controller, abortBtns} = {}) => {
    const geojsonId = layer._geojsonId
    if (!geojsonId) return
    
    const map = layer._group?._map
    const queryGeom = L.rectangle(map.getBounds()).toGeoJSON().geometry

    const mapKey = [
        geojsonId, 
        (queryGeom ? turf.bbox(queryGeom).join(',') : null), 
        controller?.id
    ].join(';')

    if (mapForUpdateGeoJSONData.has(mapKey)) {
        const data = await mapForUpdateGeoJSONData.get(mapKey)
        return addLeafletGeoJSONData(layer, data, {queryGeom, controller})
    }

    const dataPromise = (async () => {
        try {
            return await fetchGeoJSON(geojsonId, {
                queryGeom,
                controller,
                abortBtns,
            })
        } catch (error) {
            return error
        } finally {
            setTimeout(() => mapForUpdateGeoJSONData.delete(mapKey), 1000);
        }
    })()
    
    mapForUpdateGeoJSONData.set(mapKey, dataPromise)
    const data = await dataPromise
    return addLeafletGeoJSONData(layer, data, {queryGeom, controller})
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
        icon.id = `${tr.id}-icon`
        icon.className = 'd-flex flex-no-wrap gap-2 align-items-center justify-content-center'
        tr.appendChild(icon)

        const totalCount = formatNumberWithCommas(style.totalCount)
        const label = document.createElement('td')
        tr.appendChild(label)
        
        const labelContent = document.createElement('p')
        labelContent.className = 'm-0 ms-1 text-wrap'
        labelContent.appendChild(createSpan(
            style.label ? `${style.label} ` : '', {
                id:`${tr.id}-title`,
                className: `${!style.showLabel ? 'd-none' : ''}`
            })
        )
        labelContent.appendChild(createSpan(
            `(${totalCount})`, {
                id:`${tr.id}-count`,
                className: `${!style.showCount ? 'd-none' : ''}`
            }
        ))
        label.appendChild(labelContent)


        for (const type in style.types) {
            const typeCount = style.types[type].count
            
            const typeIcon = document.createElement('div')
            typeIcon.id = `${icon.id}-${type}`
            typeIcon.className = 'd-flex align-items-center justify-content-center'

            const isPoint = type === 'point'
            typeIcon.style[isPoint ? 'minHeight' : 'height'] = '14px'
            if (!isPoint) typeIcon.style['width'] = '20px'

            typeIcon.innerHTML = style.types[type].html
            titleToTooltip(typeIcon, `${formatNumberWithCommas(typeCount)} ${type}${typeCount > 1 ? 's' : ''}`)
            icon.appendChild(typeIcon) 
        }
    }

    const pointIcons = Array.from(tbody.querySelectorAll('tr')).map(i => {
        return i.querySelector(`#${i.firstChild.id}-point`)
    }).filter(i => i)
    const maxWidth = Math.max(...pointIcons.map(i => {
        const clone = i.cloneNode(true)
        clone.className = 'position-absolute'
        document.body.appendChild(clone)
        const width = clone.offsetWidth
        clone.remove()
        return width
    }))
    pointIcons.forEach(i => i.style.width = `${maxWidth}px`)
}