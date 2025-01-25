const createLayerFromURL = (data) => {
    let layer

    const handler = getCreateLayerHandler(data.layerFormat)
    if (handler) {
        layer = handler(data)
    }
    
    if (layer) {
        layer.data = data        
        if (data.layerBbox) {
            const [minX, minY, maxX, maxY] = data.layerBbox.slice(1, -1).split(',')
            const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
            layer.getBounds = () => {
                return bounds
            }
        }
    }
    
    return layer
}

const getCreateLayerHandler = (format) => {
    return {
        wms:createWMSLayer,
        wfs:createWFSLayer,
        xyz:createXYZTilesLayer,
    }[format]
}

const createWMSLayer = (data) => {
    const url = new URL(data.layerUrl)
    const baseUrl = url.origin + url.pathname
    const options = {
        layers: data.layerName, 
        format: 'image/png',
        transparent: true,
    }

    return L.tileLayer.wms(baseUrl, options)
}

const createWFSLayer = (data) => {
    return createGeoJSONLayer(data)
}

const createGeoJSONLayer = (data) => {
    const cacheKey = `${data.layerUrl}_${data.layerFormat}_${data.layerName}`

    const geojsonLayer = getDefaultGeoJSONLayer()

    const layerTitle = data.layerTitle
    geojsonLayer.data = data
    geojsonLayer.layerLegendStyle = true
    geojsonLayer.popupHeader = layerTitle
    geojsonLayer.cacheKey = cacheKey
    
    const defaultTooltip = `Zoom in to load ${layerTitle} features.`
    
    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })
    
    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('add', (event) => {
        const map = event.target._map
    
        const handler = async () => {
            if (!isHiddenInLegend(geojsonLayer, map)) {
                geojsonLayer.fire('fetchingData')
                
                const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
                const layerBounds = turf.bboxPolygon(data.layerBbox.slice(1, -1).split(','))
                const queryBounds = turf.intersect(mapBounds, layerBounds)

                let geojson

                if (queryBounds) {
                    geojson = await (async () => {
                        const cachedGeoJSONStrings = getLayersViaCacheKey(map, cacheKey)
                        .map(layer => layer.cachedGeoJSON)
                        .filter(cachedGeoJSONString => cachedGeoJSONString)                    
    
                        if (cachedGeoJSONStrings.length > 0) {
                            for (const cachedGeoJSONString of cachedGeoJSONStrings) {
                                const cachedGeoJSON = JSON.parse(cachedGeoJSONString)
                                if (cachedGeoJSON) {
                                    if (!Array('Bounding', 'Simplified').includes(cachedGeoJSON.prefix)) {
                                        const equalBounds = turf.booleanEqual(queryBounds, cachedGeoJSON.mapBounds)
                                        const withinBounds = turf.booleanWithin(queryBounds, cachedGeoJSON.mapBounds)
                                        if (equalBounds || withinBounds) {
                                            if (!geojsonLayer.cachedGeoJSON) {
                                                geojsonLayer.cachedGeoJSON = cachedGeoJSONString
                                                
                                            }
    
                                            let filterBounds = L.rectangle(map.getBounds()).toGeoJSON()
                                            const crs = getGeoJSONCRS(cachedGeoJSON)
                                            if (crs && crs !== 4326) {
                                                filterBounds = await transformFeatureGeometry(filterBounds, 4326, crs)
                                            }
                                            
                                            cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
                                                return turf.booleanIntersects(filterBounds, feature)
                                            })
                                            
                                            return cachedGeoJSON
                                        }
                                    }
                                }
                            }
                        }
    
                        return
                    })()
    
                    if (!geojson) {
                        delete geojsonLayer.cachedGeoJSON
    
                        geojson = await fetchLibraryData(event, geojsonLayer)
                        if (!geojson) {
                            geojson = {
                                type: 'FeatureCollection',
                                features: [turf.polygonToLine(layerBounds)],
                                tooltip: defaultTooltip,
                                prefix: 'Bounding',
                                suffix: 'for all features',
                            }
                        } else {
                            geojson.mapBounds = mapBounds
                            if (geojson.features.length > 0) {
                                geojson.cachedGeoJSON = JSON.stringify(geojson)
                            }
                        }
                    }
    
                    if (!geojson.processed) {
                        geojson.processed = true
        
                        const mapScale = getMeterScale(map)
                        const mapZoom = map.getZoom()    
                        const featureCount = geojson.features.length
                        
                        if (featureCount > 1000 && ((mapScale && mapScale > 10000) || (!mapScale && mapZoom < 10))) {
                            if (featureCount > 2000 || ((mapScale && mapScale > 100000) || (!mapScale && mapZoom < 6))) {
                                const boundsGeoJSON = L.rectangle(L.geoJSON(geojson).getBounds()).toGeoJSON()
                                const feature = turf.polygonToLine(boundsGeoJSON)
                                geojson.features = [feature]
                                geojson.tooltip = defaultTooltip
                                geojson.prefix = 'Bounding'
        
                                let totalMatched = 'features'
                                const numberMatched = geojson.numberMatched
                                const numberReturned = geojson.numberReturned
                                if (numberMatched && numberReturned && numberMatched !== numberReturned) {
                                    totalMatched = `returned of ${formatNumberWithCommas(numberMatched)} matched features`
                                }
        
                                geojson.suffix = `for ${formatNumberWithCommas(featureCount)} ${totalMatched}`
                            } else {
                                try {
                                    geojson = turf.simplify(geojson, { tolerance: 0.01 })
                                    geojson.prefix = 'Simplified'
                                } catch {
                                
                                }
                            }
                        }                
        
                        await handleGeoJSON(geojson)
                    }
        
                    if (!geojsonLayer.cachedGeoJSON && geojson.cachedGeoJSON) {
                        if (Array('Bounding', 'Simplified').includes(geojson.prefix)) {
                            geojsonLayer.cachedGeoJSON = geojson.cachedGeoJSON
                        } else {
                            geojsonLayer.cachedGeoJSON = JSON.stringify(geojson)
                        }
                        
                    }
                } else {
                    geojson = {
                        type: 'FeatureCollection',
                        features: [],
                    }
                }

                geojsonLayer.clearLayers()
                geojsonLayer.addData(geojson)
    
                if (geojsonLayer._openPopups.length > 0) {
                    geojsonLayer._openPopups.forEach(popup => popup.openOn(map))
                    geojsonLayer._openPopups = []
                }
    
                let legend = {}
                geojsonLayer.eachLayer(feature => {
                    feature.popupHeader = data.layerTitle
    
                    if (geojson.tooltip) {
                        feature.bindTooltip(geojson.tooltip, {sticky:true})
                    } 
    
                    let type = feature.feature.geometry.type.replace('Multi', '')
                    if (geojson.prefix === 'Bounding') {
                        type = 'box'
                    }

                    let label = type
                    if (type !== 'Point') {
                        label = Array(geojson.prefix, type, geojson.suffix).filter(part => part).join(' ')
                    }
    
                    if (!Object.keys(legend).includes(label)) {
                        let style
                        if (type === 'Point') {
                            style = geojsonLayer.options.pointToLayer().options.icon
                        } else {
                            style = geojsonLayer.options.style()
                        }
    
                        legend[label] = {
                            type: type,
                            style: style,
                            count: 1,
                        }
                    } else {
                        legend[label].count += 1 
                    }
                })
    
                geojsonLayer.layerLegendStyle = legend
                geojsonLayer.fire('legendUpdated')
            }
        }
    
        let fetchWFSDataTimeout
        const handlerOnTimeout = () => {
            clearTimeout(fetchWFSDataTimeout)
            fetchWFSDataTimeout = setTimeout(handler, 1000)
        }
    
        handlerOnTimeout()
        map.on('moveend zoomend', handlerOnTimeout)
        geojsonLayer.on('remove', () => {
            map.off('moveend zoomend', handlerOnTimeout)
        })
    })

    return geojsonLayer
}

const createXYZTilesLayer = (data) => {
    return L.tileLayer(data.layerUrl)
}
