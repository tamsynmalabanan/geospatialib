const getLeafletGeoJSONLayer = async ({
    geojson,
    group,
    pane = 'overlayPane',
    dbIndexedKey,
    properties = {},
    customStyleParams = {},
    params = {},
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pane,
        renderer: new L.SVG({pane}),
        markersInheritOptions: true,
    })

    geojsonLayer._params = params ?? {}
    geojsonLayer._group = group
    geojsonLayer._renderers = [geojsonLayer.options.renderer, new L.Canvas({pane})]
    
    properties = geojsonLayer._properties = properties ?? {}
    properties.info = properties.info ?? {
        showLegend: true,
        showAttribution: true,
        tooltip: {
            active: true,
            properties: [],
            delimiter: '; ',
            prefix: '',
            suffix: '',
        },
        popup: {
            active: true,
            properties: [],
        },
    }
    properties.symbology = properties.symbology ?? {
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
    }
    properties.visibility = properties.visibility ?? {
        active: false,
        min: 10,
        max: 5000000,
    }
    properties.filters = properties.filters ?? {
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

    geojsonLayer._ch = {
        getFeatureStyleParams: (feature) => {
            const symbology = geojsonLayer._properties?.symbology
            return (symbology?.groups)?.[feature.properties.__groupId__]?.styleParams || symbology?.default?.styleParams || getLeafletStyleParams()
        },
        isPatternFilledPolygonInCanvas: (feature) => {
            const styleParams = geojsonLayer._ch.getFeatureStyleParams(feature)
            return (
                geojsonLayer.options.renderer instanceof L.Canvas
                && turf.getType(feature).endsWith('Polygon')
                && styleParams.fillPattern !== 'solid' 
                && document.querySelector(`#${styleParams.fillPatternId}-img`)?.getAttribute('src')
            )
        }
    }

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const handler = (layer) => {
            layer._params = layer._params ?? {}
            layer.options.pane = geojsonLayer.options.pane
            
            const info = geojsonLayer._properties.info
            
            const properties = feature.properties
            if (Object.keys(properties).length) {
                const tooltip = info.tooltip
                
                layer._params.title = tooltip.properties.length ? (() => {
                    const values = tooltip.properties.map(i => {
                        let value = properties[i]
                        if (!isNaN(Number(value))) {
                            return formatNumberWithCommas(Number(value))
                        }
                        value = value ?? 'null'
                        return String(value)
                    })
                    return values.some(i => i !== 'null') ? [tooltip.prefix, values.join(tooltip.delimiter), tooltip.suffix].join(' ').trim() : null
                })() : getFeatureTitle(properties)

                if (tooltip.active) layer.bindTooltip(layer._params.title, {sticky:true})

                const popup = info.popup
                if (popup.active) {
                    let popupProperties = {}
                    if (popup.properties.length) {
                        for (const i of popup.properties) {
                            popupProperties[i] = properties[i]
                        }
                    } else {
                        popupProperties = properties
                    }

                    const popupContent = createFeaturePropertiesTable(popupProperties, {
                        header: (() => {
                            const popupHeader = () => [geojsonLayer, layer].map(i => i._params.title).filter(i => i).join(': ').trim()
                            layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = popupHeader())
                            return popupHeader()
                        })()
                    }).outerHTML
                    layer.bindPopup(popupContent, {autoPan: false})
                }
            }

            layer.on('contextmenu', (e) => getLeafletLayerContextMenu(e.originalEvent, layer))
        }
    
        const styleParams = geojsonLayer._ch.getFeatureStyleParams(feature)
        if (geojsonLayer._ch.isPatternFilledPolygonInCanvas(feature)) {
            layer.once('add', () => {
                geojsonLayer.removeLayer(layer)
                
                const poly = L.polygon(
                    layer.getLatLngs(), 
                    getLeafletLayerStyle(feature, styleParams, {
                        renderer:geojsonLayer.options.renderer
                    })
                )
                
                poly.feature = feature
                handler(poly)
                poly.addTo(geojsonLayer)
            })
        } else {
            handler(layer)
        }
    }

    geojsonLayer.options.style = (feature) => {
        const styleParams = geojsonLayer._ch.getFeatureStyleParams(feature)
        if (geojsonLayer._ch.isPatternFilledPolygonInCanvas(feature)) return
        return getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
    }

    geojsonLayer.options.pointToLayer = (feature, latlng) => {
        const styleParams = geojsonLayer._ch.getFeatureStyleParams(feature)
        const icon = getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
        return icon instanceof L.DivIcon ? L.marker(latlng, {icon}) : L.circleMarker(latlng, icon)
    }

    if (geojson) {
        if (geojson.type === 'Feature') geojson = turf.featureCollection([geojson])
        await normalizeGeoJSON(geojson)
    }

    if (group._map._legendLayerGroups.includes(group)) {
        geojsonLayer._dbIndexedKey = geojson ? saveToGISDB(
            geojson, {...(dbIndexedKey ? {id:dbIndexedKey} : {})}
        ) : dbIndexedKey
        geojsonLayer.on('popupopen', (e) => geojsonLayer._openpopup = e.popup)
        geojsonLayer.on('popupclose', (e) => delete geojsonLayer._openpopup)
        geojsonLayer.on('add', () => updateLeafletGeoJSONLayer(geojsonLayer, {updateCache:false}))
        geojsonLayer.on('remove', () => geojsonLayer.clearLayers())
        
        if (!params?.bbox && geojson) {
            geojsonLayer._params.bbox = JSON.stringify(turf.bbox(geojson))
        }
    } else if (geojson) {
        geojsonLayer.addData(geojson)
    }

    return geojsonLayer
}

const getFeatureTitle = (properties) => {
    let title

    for (const key of [
        'title',
        'display_name',
        'name:en',
        'name',
        'feature_id',
        'type',
    ]) {
        const matches = Object.keys(properties).filter(i => i === key || i.includes(key))
        if (!matches.length) {
            continue
        } else {
            title = String(properties[matches[0]])
            break
        }
    }

    if (!title) {
        for (const key in properties) {
            const value = properties[key]
            if (typeof value !== 'object' && value.length < 50) {
                title = `${key}: ${value}`
                break
            }
        }
    }

    return title
}

const getLeafletGeoJSONData = async (layer, {
    geojson,
    controller, 
    abortBtns,
    filter=true,
    queryGeom=false,
    group=false,
    sort=false,
    simplify=false,
    event,
} = {}) => {
    if (!layer) return

    const dbIndexedKey = layer._dbIndexedKey
    if (!dbIndexedKey) return
    
    const map = layer._map ?? layer._group?._map
    if (!map) return

    const geojsonHasFeatures = geojson?.features?.length
    queryGeom = queryGeom === true ? turf.bboxPolygon(getLeafletMapBbox(map)).geometry : queryGeom

    if (geojsonHasFeatures && queryGeom) {
        const queryExtent = turf.getType(queryGeom) === 'Point' ? turf.buffer(
            queryGeom, leafletZoomToMeter(zoom)/2/1000
        ).geometry : queryGeom
        geojson.features = geojson.features.filter(feature => {
            if (controller?.signal?.aborted) return
            return turf.booleanIntersects(queryExtent, feature)
        })
    }

    let data = geojsonHasFeatures ? geojson : (await getGeoJSON(dbIndexedKey, {
        queryGeom,
        controller,
        abortBtns,
        event,
    }))

    if (!data) return

    if (controller?.signal.aborted) return
    if (data instanceof Error) {
        layer.fire('dataerror')
        return
    }
    
    data = turf.clone(data)

    if (data.features?.length) {
        const filters = layer._properties.filters
        const hasActiveFilters = filter && Object.values(filters).some(i => {
            if (!i.active) return false
            return Object.values(i.values).some(j => {
                return !j.hasOwnProperty('active') || j.active
            })
        })
    
        const groups = Object.entries((layer._properties.symbology.groups ?? {})).sort(([keyA, valueA], [keyB, valueB]) => {
            return valueA.rank - valueB.rank
        })
        const hasActiveGroups = group && groups.some(i => i[1].active)
        
        if (hasActiveFilters || hasActiveGroups) {
            data.features = data.features.filter(feature => {
                if (controller?.signal?.aborted) return
                const valid = hasActiveFilters ? validateGeoJSONFeature(feature, filters) : true
            
                if (valid) {
                    const properties = feature.properties
                    properties.__groupId__ = ''
                    properties.__groupRank__ = groups.length + 1
        
                    if (hasActiveGroups) {
                        for (const [id, group] of groups) {
                            if (controller?.signal?.aborted) break
            
                            if (!group.active || !validateGeoJSONFeature(feature, group.filters ?? {})) continue
                            
                            properties.__groupId__ = id
                            properties.__groupRank__ = group.rank
                            break
                        }
                    }
                }
        
                return valid
            })
        }
        
        // let tolerance = 0
        // if (simplify) {
        //     if (controller?.signal?.aborted) return
            
        //     const scale = getLeafletMeterScale(map)
        //     tolerance = scale > 1000 && data.features.length > 100 ? scale/10000000 : 0
        //     if (tolerance > 0) {
        //         turf.simplify(data, {
        //             mutate: true,
        //             tolerance, 
        //             highQuality: false
        //         })
        //     }
        // }
        // layer._tolerance = tolerance
    
        if (sort) {
            if (controller?.signal?.aborted) return
            sortGeoJSONFeatures(data, {reverse:true})
        }
    }    

    return data
}

const updateLeafletGeoJSONLayer = async (layer, {geojson, controller, abortBtns, updateCache=true} = {}) => {
    if (!layer) return

    if (!layer._map || layer._map._ch.hasHiddenLegendLayer(layer) || !leafletLayerIsVisible(layer)) return

    layer.fire('dataupdating')
    const data = await getLeafletGeoJSONData(layer, {
        geojson, 
        controller, 
        abortBtns, 
        queryGeom: true,
        group: true,
        sort: true,
        simplify: true,
    })
    if (!data) return

    if (controller?.signal?.aborted) return
    const renderer = (data?.features?.length ?? 0) > 1000 ? L.Canvas : L.SVG
    if (!(layer.options.renderer instanceof renderer)) {
        layer.options.renderer._container?.classList.add('d-none')
        layer.options.renderer = layer._renderers.find(r => {
            return r instanceof renderer
        })
    }
    layer.options.renderer._container?.classList.remove('d-none')
    
    layer.clearLayers()
    layer.addData(data)
    layer.fire('dataupdate')
    
    if (updateCache) layer._map?._ch.updateCachedLegendLayers({layer})
}

const getGeoJSONLayerStyles = (layer) => {
    const symbology = layer._properties.symbology
    
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
            const layerTypeFilter = layer._properties.filters.type
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
        const groupId = feature.properties.__groupId__ ?? ""
        const style = styles[groupId] ?? styles['']
        style.types[featureType.split('multi')[featureType.split('multi').length-1]].count +=1
    })

    Object.keys(styles).forEach(i => {
        const style = styles[i]
        const totalCount = Object.values(style.types).map(type => type.count || 0).reduce((a, b) => a + b, 0)
        i === '' && totalCount === 0 && Object.keys(styles).length > 1 ? delete styles[i] : style.totalCount = totalCount
    })

    const typesString = [...new Set(Object.values(styles).map(i => Object.keys(i.types).filter(j => i.types[j].count > 0).join(',')))]
    if (typesString.length === 1 && typesString[0] !== '') {
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

    if (!styles.reduce((acc, num) => acc + num[1].totalCount, 0)) {
        return
    }
  
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
        labelContent.className = 'm-0 ms-1 text-wrap gap-1'
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