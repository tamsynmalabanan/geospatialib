const getLeafletGeoJSONLayer = async ({
    geojson,
    group,
    pane = 'overlayPane',
    indexedDBKey,
    properties = {},
    customStyleParams = {},
    params = {},
} = {}) => {
    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pane,
        renderer: new L.SVG({pane}),
        markersInheritOptions: true,
    })

    geojsonLayer._group = group
    geojsonLayer._renderers = [geojsonLayer.options.renderer, new L.Canvas({pane})]
    
    params.name = params.name ?? params.title
    params.title = params.title ?? params.name
    geojsonLayer._params = params
    
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
        case: false,
        method: 'single',
        groupBy: [],
    }
    properties.visibility = properties.visibility ?? {
        active: false,
        min: 10,
        max: 5000000,
    }

    properties.limits = properties.limits ?? {
        active: true,
        max: 1000,
        method: 'limit'
    }

    properties.transformations = properties.transformations ?? {
        simplify: {
            active: false,
            values: {
                'None': {
                    active: true,
                    fn: null,
                },
                'Centroid': {
                    active: false,
                    fn: 'centroid',
                },
                'Bounding box': {
                    active: false,
                    fn: 'envelope',
                },
                'Simplify by tolerance': {
                    active: false,
                    fn: 'simplify',
                    options: {
                        tolerance: 0,
                    }
                },
            }
        },
        // clustering: {
        //     active: false,
        //     method: {
        //         'None': {
        //             active: true,
        //             fn: null,
        //         },
        //         'Density-based clustering': {
        //             active: false,
        //             fn: 'clustersDbscan',
        //             params: {
        //                 maxDistance: 10,
        //             }
        //         },
        //         'K-means clustering': {
        //             active: false,
        //             fn: 'clustersKmeans',
        //             options: {
        //                 numberOfClusters: 'default',
        //             }
        //         },
        //     }
        // }
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

    geojsonLayer._handlers = {
        getFeatureStyleParams: (feature) => {
            const symbology = geojsonLayer._properties?.symbology
            return (symbology?.groups)?.[feature.properties.__groupId__]?.styleParams || symbology?.default?.styleParams || getLeafletStyleParams()
        },
        isPatternFilledPolygonInCanvas: (feature) => {
            const styleParams = geojsonLayer._handlers.getFeatureStyleParams(feature)
            return (
                geojsonLayer.options.renderer instanceof L.Canvas
                && turf.getType(feature).endsWith('Polygon')
                && styleParams.fillPattern === 'icon' 
                && document.querySelector(`#${styleParams.fillPatternId}-img`)?.getAttribute('src')
            )
        }
    }

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const handler = (layer) => {
            layer._params = layer._params ?? {}
            layer.options.pane = geojsonLayer.options.pane
            
            const isMapDrawControlLayer = group._name === 'local' && geojsonLayer._indexedDBKey === group._map._drawControl?.options?.edit?.featureGroup?._indexedDBKey
            
            const properties = feature.properties
            const cleanProperties = cleanFeatureProperties(properties)

            // updates an array of feature property keys
            const info = geojsonLayer._properties.info
            info.attributes = Array.from(new Set([...Object.keys(properties), ...(info.attributes ?? [])]))
            
            const tooltip = info.tooltip
            layer._params.title = tooltip.properties.length ? (() => {
                const values = tooltip.properties.map(i => {
                    let value = properties[i]
                    
                    if (!isNaN(value)) return formatNumberWithCommas(Number(value))

                    value = value ?? 'null'
                    return String(value)
                })
                return values.some(i => i !== 'null') ? [tooltip.prefix ?? '', values.join(tooltip.delimiter), tooltip.suffix ?? ''].join(' ').trim() : null
            })() : getFeatureTitle(cleanProperties)
            if (tooltip.active && layer._params.title) layer.bindTooltip(layer._params.title, {sticky:true})
            
            const popup = info.popup
            if (popup.active || isMapDrawControlLayer) {
                let popupProperties = {}
                if (popup.properties.length && !isMapDrawControlLayer) {
                    for (const i of popup.properties) {
                        popupProperties[i] = properties[i]
                    }
                } else {
                    popupProperties = properties
                }

                const getPopupHeader = () => [geojsonLayer, layer].map(i => i._params.title).filter(i => i).join(': ').trim()
                const content = createFeaturePropertiesTable(popupProperties, {header: getPopupHeader()})
                
                if (isMapDrawControlLayer) {
                    content.classList.remove('table-striped')

                    const toggleSaveBtn = () => {
                        const rows = Array.from(content.querySelectorAll('tbody tr'))
                        
                        const hasChangedField = rows.find(row => {
                            if (!row.querySelector('input')) return

                            const nameChanged = row.firstChild.firstChild.value.trim() !== row.firstChild.firstChild.getAttribute('placeholder')
                            const valueChanged = row.firstChild.nextElementSibling.firstChild.value.trim() !== row.firstChild.nextElementSibling.firstChild.getAttribute('placeholder')
                            return nameChanged || valueChanged || !row.lastChild.firstChild.checked
                        })
                        
                        const allValidNames = rows.every(row => !row.lastChild.firstChild.checked || row.firstChild.firstChild.value.trim() !== '')
                        
                        const names = rows.filter(row => row.lastChild.firstChild.checked).map(row => row.firstChild.firstChild.value.trim())
                        const allUniqueNames = new Set(names).size === names.length

                        enable = hasChangedField && allValidNames && allUniqueNames

                        saveBtn.classList.toggle('disabled', !enable)
                    }

                    const checkPropertyNameDuplicate = (e) => {
                        const duplicate = Array.from(content.querySelectorAll('tbody tr')).filter(row => row.firstChild.firstChild.value === e.target.value)
                        if (duplicate.length > 1) {
                            e.target.classList.add('bg-danger')
                            e.target.setAttribute('title', 'Duplicate property name')
                        } else {
                            e.target.classList.remove('bg-danger')
                            e.target.removeAttribute('title')
                        }
                    }

                    Array.from(content.querySelectorAll('tbody tr')).forEach(row => {
                        const propertyName = row.firstChild.innerText
                        if (propertyName.startsWith('__') && propertyName.endsWith('__')) return

                        const propertyValue = row.firstChild.nextElementSibling.innerText
                        
                        Array.from(row.children).forEach(i => i.innerHTML = '')

                        const nameField = customCreateElement({
                            parent: row.firstChild,
                            tag: 'input',
                            className: 'border-0 p-0 m-0',
                            attrs: {type: 'text', value: propertyName, placeholder: propertyName},
                            style: {width:'100px'},
                            events: {
                                change: (e) => {
                                    if (e.target.value === '') {
                                        e.target.value = propertyName
                                    }

                                    checkPropertyNameDuplicate(e)

                                    toggleSaveBtn()
                                }
                            }
                        })
                        
                        const valueField = customCreateElement({
                            parent: row.firstChild.nextElementSibling,
                            tag: 'input',
                            className: 'border-0 p-0 m-0',
                            attrs: {type: 'text', value: propertyValue, placeholder: propertyValue},
                            style: {width:'100px'},
                            events: {
                                change: (e) => toggleSaveBtn()
                            }
                        })

                        const td = customCreateElement({
                            parent: row,
                            tag: 'td',
                        })

                        const checkbox = customCreateElement({
                            parent: td,
                            tag: 'input',
                            attrs: {type: 'checkbox'},
                            events: {
                                click: (e) => toggleSaveBtn()
                            }
                        })
                        .checked = true
                    })

                    const tfoot = customCreateElement({
                        parent: content,
                        tag: 'tfoot',
                    })

                    const tfoottr = customCreateElement({
                        parent: tfoot,
                        tag: 'tr',
                    })

                    const tfootth = customCreateElement({
                        parent: tfoottr,
                        tag: 'th',
                        attrs: {scope:'col', colspan:'3'},
                        style: {borderBottomWidth: '0px'}
                    })

                    const tfootdiv = customCreateElement({
                        parent: tfootth,
                        className: 'd-flex justify-content-between gap-5'
                    })

                    const addBtn = customCreateElement({
                        parent: tfootdiv,
                        tag: 'button',
                        className: 'btn btn-primary btn-sm badge',
                        innerHTML: 'Add',
                        events: {
                            click: (e) => {
                                const tr = customCreateElement({
                                    parent: content.querySelector('tbody'),
                                    tag: 'tr'
                                })

                                const nameTd = customCreateElement({
                                    parent: tr,
                                    tag: 'td'
                                })

                                const nameField = customCreateElement({
                                    parent: nameTd,
                                    tag: 'input',
                                    className: 'border-0 p-0 m-0',
                                    attrs: {type: 'text', value: '', placeholder: ''},
                                    style: {width:'100px'},
                                    events: {
                                        change: (e) => {
                                            checkPropertyNameDuplicate(e)
                                            toggleSaveBtn()
                                        }
                                    }
                                })

                                const valueTd = customCreateElement({
                                    parent: tr,
                                    tag: 'td'
                                })
                                
                                const valueField = customCreateElement({
                                    parent: valueTd,
                                    tag: 'input',
                                    className: 'border-0 p-0 m-0',
                                    attrs: {type: 'text', value: '', placeholder: ''},
                                    style: {width:'100px'},
                                    events: {
                                        change: (e) => toggleSaveBtn()
                                    }
                                })

                                const td = customCreateElement({
                                    parent: tr,
                                    tag: 'td',
                                })

                                const checkbox = customCreateElement({
                                    parent: td,
                                    tag: 'input',
                                    attrs: {type: 'checkbox'},
                                    events: {
                                        click: (e) => toggleSaveBtn()
                                    }
                                })
                                .checked = true
                            }
                        }
                    })

                    const saveBtn = customCreateElement({
                        parent: tfootdiv,
                        tag: 'button',
                        className: 'btn btn-success btn-sm badge disabled',
                        innerHTML: 'Save',
                        events: {
                            click: async (e) => {
                                const newProperties = {}
                                Array.from(content.querySelectorAll('tbody tr')).forEach(row => {
                                    if (row.lastChild.firstChild.checked) {
                                        const propertyName = row.firstChild.firstChild.value.trim()
                                        const propertyValue = row.firstChild.nextElementSibling.firstChild.value.trim()
                                        newProperties[propertyName] = propertyValue
                                    }
                                })

                                layer.closePopup()

                                let newFeature = structuredClone(feature)
                                newFeature.properties = newProperties
                                newFeature = (await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]

                                const {gisData, queryExtent} = await getFromGISDB(geojsonLayer._indexedDBKey)
                                gisData.features = [
                                    ...gisData.features.filter(i => i.properties.__gsl_id__ !== feature.properties.__gsl_id__),
                                    newFeature
                                ]

                                await saveToGISDB(turf.clone(gisData), {
                                    id: geojsonLayer._indexedDBKey,
                                    queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                                })

                                group.getLayers().forEach(i => {
                                    if (i._indexedDBKey !== geojsonLayer._indexedDBKey) return
                                    updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                                })

                                group._map._drawControl._addChange({
                                    type: 'edited',
                                    features: [{
                                        old: feature,
                                        new: newFeature
                                    }]
                                })

                                group._map._drawControl._toggleEditBtn(gisData)
                            }
                        }
                    })
                }
                
                layer.bindPopup(content, {autoPan: false})
                layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = getPopupHeader())
            }

            layer.on('contextmenu', (e) => getLeafletLayerContextMenu(e.originalEvent, layer))

            if ((group._map._measuredFeatures ?? []).includes(`${geojsonLayer._leaflet_id}-${feature?.properties.__gsl_id__}`)) {
                layer._measuredFeature = true
                layer.options.showMeasurements = true
            }
        }
    
        const styleParams = geojsonLayer._handlers.getFeatureStyleParams(feature)
        if (geojsonLayer._handlers.isPatternFilledPolygonInCanvas(feature)) {
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
        const styleParams = geojsonLayer._handlers.getFeatureStyleParams(feature)
        if (geojsonLayer._handlers.isPatternFilledPolygonInCanvas(feature)) return
        return getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
    }

    geojsonLayer.options.pointToLayer = (feature, latlng) => {
        const styleParams = geojsonLayer._handlers.getFeatureStyleParams(feature)
        const icon = getLeafletLayerStyle(feature, styleParams, {renderer:geojsonLayer.options.renderer})
        const pane = geojsonLayer.options.pane
        return icon instanceof L.DivIcon ? L.marker(latlng, {icon, pane}) : L.circleMarker(latlng, {...icon, pane})
    }

    if (geojson) {
        if (geojson.type === 'Feature') geojson = turf.featureCollection([geojson])
        await normalizeGeoJSON(geojson)
    }

    if (group._map._legendLayerGroups.includes(group)) {
        geojsonLayer._indexedDBKey = geojson ? await saveToGISDB(
            geojson, {...(indexedDBKey ? {id:indexedDBKey} : {name:geojsonLayer._params.name})}
        ) : indexedDBKey
        geojsonLayer.on('popupopen', (e) => geojsonLayer._openpopup = e.popup)
        geojsonLayer.on('popupclose', (e) => delete geojsonLayer._openpopup)
        geojsonLayer.on('add', () => updateLeafletGeoJSONLayer(geojsonLayer, {updateLocalStorage:false}))
        geojsonLayer.on('remove', () => geojsonLayer.clearLayers())
        
        if (!params?.bbox && geojson?.features.length) {
            geojsonLayer._params.bbox = JSON.stringify(turf.bbox(geojson))
        }
    } else if (geojson) {
        geojsonLayer.addData(geojson)
    }

    return geojsonLayer
}

const cleanFeatureProperties = (properties) => {
    return Object.fromEntries(Object.entries(properties).filter(([key]) => {
        return !(key.startsWith('__') && key.endsWith('__'))
    }))
}

const getFeatureTitle = (properties) => {
    let title

    for (const key of [
        'name:en',
        'name',
        'display',
        'title',
        'id',
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
            if (value.length > 64) continue
            
            title = `${key}: ${value}`
            break
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
    transform=false,
    event,
} = {}) => {
    if (!layer) return
    
    const indexedDBKey = layer._indexedDBKey
    if (!indexedDBKey) return
    
    const map = layer._map ?? layer._group?._map
    if (!map) return
    
    const isEditable = layer._indexedDBKey === layer._map._drawControl?.options?.edit?.featureGroup?._indexedDBKey
    queryGeom = isEditable ? false : queryGeom === true ? turf.bboxPolygon(getLeafletMapBbox(map)).geometry : queryGeom

    if (geojson?.features?.length && queryGeom) {
        const queryExtent = turf.getType(queryGeom) === 'Point' ? turf.buffer(
            queryGeom, leafletZoomToMeter(zoom)/2/1000
        ).geometry : queryGeom
        geojson.features = geojson.features.filter(feature => {
            if (controller?.signal?.aborted) return
            return turf.booleanIntersects(queryExtent, feature)
        })
    }

    let data = geojson ?? (await getGeoJSON(indexedDBKey, {
        queryGeom,
        zoom: map.getZoom(),
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

        if (transform ) {
            const transformations = layer._properties.transformations

            const simplifyFn = Object.values(transformations.simplify.values).find(i => i.active && i.fn && (i.fn !== 'simplify' || i.options.tolerance > 0))
            if (transformations.simplify.active && simplifyFn) {
                data.features = data.features.map(feature => {
                    if (turf.getType(feature) === 'Point') return feature

                    let newFeature
                    try {
                        newFeature = turf[simplifyFn.fn](feature, {...(simplifyFn.options ?? {})})
                        newFeature.properties = feature.properties
                    } catch {
                        newFeature = feature
                    }

                    return newFeature
                })
            }
        }
        
        if (sort) {
            if (controller?.signal?.aborted) return
            sortGeoJSONFeatures(data, {reverse:true})
        }
    }    

    return data
}

const isUnderenderedLayer = (layer) => {
    return layer._group._map._handlers.hasHiddenLegendLayer(layer) || layer._group._map._handlers.hasHiddenLegendGroupLayer(layer) || !leafletLayerIsVisible(layer)
}

const updateLeafletGeoJSONLayer = async (layer, {geojson, controller, abortBtns, updateLocalStorage=true} = {}) => {
    if (!layer || !layer._map || isUnderenderedLayer(layer)) return

    const map = layer._map ?? layer._group?._map
    if (!map) return

    const isEditable = layer._indexedDBKey === map._drawControl?.options?.edit?.featureGroup?._indexedDBKey
    const preventUpdate = isEditable && map._drawControl?._editMode

    layer.fire('dataupdating')
    const data = !preventUpdate ? await getLeafletGeoJSONData(layer, {
        geojson, 
        controller, 
        abortBtns, 
        group: true,
        sort: true,
        queryGeom: !isEditable,
        filter: !isEditable,
        transform: !isEditable,
    }) : layer.toGeoJSON()
    if (!data) return

    if (controller?.signal?.aborted) return
    
    if (!preventUpdate) {
        const limits = layer._properties.limits
        limits.totalCount = data?.features?.length

        if (!isEditable && limits.active && limits.totalCount > limits.max) {
            if (limits.method === 'limit') {
                data.features = data.features.slice(-limits.max)
            } else {
                let nextZoom = map.getZoom() + 1
    
                if (limits.method === 'zoomin' && nextZoom <= 20) {
                    map.setZoom(nextZoom)
                }
    
                if (limits.method === 'scale') {
                    const currentScale = getLeafletMeterScale(map)
                    
                    let minScale = currentScale
                    while (minScale >= currentScale) {
                        minScale = leafletZoomToMeter(nextZoom)
                        nextZoom+=1
                    }
                    
                    const maxScale = layer._properties.visibility.min
                    layer._properties.visibility.max = maxScale > minScale ? maxScale : minScale
                    layer._properties.visibility.active = true
    
                    updateLeafletGeoJSONLayer(layer, {geojson, controller, abortBtns, updateLocalStorage})
                    
                    const event = new Event("change", { bubbles: true })
                    const mapContainer = map.getContainer()
                    mapContainer.querySelector(`#${mapContainer.id}-panels-style-body`).parentElement.firstChild.querySelector('select').dispatchEvent(event)
                }

                return
            }
        }
    
        const renderer = data?.features?.length > 1000 ? L.Canvas : L.SVG
        if (!(layer.options.renderer instanceof renderer)) {
            layer.options.renderer._container?.classList.add('d-none')
            layer.options.renderer = layer._renderers.find(r => {
                return r instanceof renderer
            })
        }
    
        layer.options.renderer._container?.classList.remove('d-none')
        
        layer.clearLayers()

        layer.addData(data)
    }

    layer.fire('dataupdate')
    
    if (updateLocalStorage) map._handlers.updateStoredLegendLayers({layer})
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
        
        typeNames = typeNames?.map(i => i.toLowerCase().replaceAll('multi', '')) || Array('point', 'linestring', 'polygon')

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
                    }, {...styleParams, iconOffset:'0,0'}, {forLegend: true}),
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
        icon.className = 'd-flex flex-no-wrap gap-2 align-items-center justify-content-center bg-transparent'
        tr.appendChild(icon)

        const totalCount = formatNumberWithCommas(style.totalCount)
        const label = document.createElement('td')
        label.className = 'bg-transparent'
        tr.appendChild(label)
        
        const labelContent = document.createElement('p')
        labelContent.className = 'm-0 ms-1 text-wrap gap-1'
        labelContent.appendChild(createSpan(
            style.label ? `${style.label} ` : '', {
                id:`${tr.id}-title`,
                className: `user-select-none ${!style.showLabel ? 'd-none' : ''}`
            })
        )
        labelContent.appendChild(createSpan(
            `(${totalCount})`, {
                id:`${tr.id}-count`,
                className: `user-select-none ${!style.showCount ? 'd-none' : ''}`
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
        clone.firstChild.style.maxWidth = ''
        document.body.appendChild(clone)
        const width = clone.offsetWidth
        clone.remove()
        return width
    }))
    
    pointIcons.forEach(i => i.style.width = `${maxWidth}px`)
}