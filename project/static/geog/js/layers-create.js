const createLayerFromURL = (data) => {
    let layer

    const handler = getCreateLayerHandler(data.layerFormat)
    if (handler) {
        layer = handler(data)
    }
    
    if (layer) {
        layer.data = Object.assign({}, data)        
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

    const getLayerTitle = () => geojsonLayer.data.legendLabel || geojsonLayer.data.layerTitle
    geojsonLayer.popupHeader = getLayerTitle    
    data.layerLegendStyle = true
    geojsonLayer.cacheKey = cacheKey
        
    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })
    
    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('add', (event) => {
        const map = event.target._map
        let abortController = new AbortController()
    
        const handler = async (signal) => {
            if (signal.aborted) return
            if (isHiddenInLegend(geojsonLayer, map)) return
            
            geojsonLayer.fire('fetchingData')
            
            const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
            const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
            const queryBounds = layerBounds ? turf.intersect(mapBounds, layerBounds) : mapBounds

            let geojson

            if (queryBounds) {
                if (signal.aborted) return
                geojson = await (async () => {
                    const cachedGeoJSONStrings = getLayersViaCacheKey(map, cacheKey)
                    .map(layer => layer.cachedGeoJSON)
                    .filter(cachedGeoJSONString => cachedGeoJSONString)                    
                    if (cachedGeoJSONStrings.length === 0) return
                    
                    for (const cachedGeoJSONString of cachedGeoJSONStrings) {
                        if (signal.aborted) return
                        
                        const cachedGeoJSON = JSON.parse(cachedGeoJSONString)
                        if (!cachedGeoJSON) {continue}
                        if (Array('Bounding', 'Simplified').includes(cachedGeoJSON.prefix)) {continue}
                        
                        try {
                            const equalBounds = turf.booleanEqual(queryBounds, cachedGeoJSON.mapBounds)
                            const withinBounds = turf.booleanWithin(queryBounds, cachedGeoJSON.mapBounds)
                            if (!equalBounds && !withinBounds) {continue}
                        } catch {
                            return
                        }
                        
                        if (!geojsonLayer.cachedGeoJSON) {
                            geojsonLayer.cachedGeoJSON = cachedGeoJSONString
                        }
                        
                        let filterBounds = L.rectangle(map.getBounds()).toGeoJSON()
                        const crs = getGeoJSONCRS(cachedGeoJSON)
                        if (crs && crs !== 4326) {
                            if (signal.aborted) return
                            filterBounds = await transformFeatureGeometry(filterBounds, 4326, crs)
                        }
                        
                        cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
                            if (signal.aborted) return
                            return turf.booleanIntersects(filterBounds, feature)
                        })
                        
                        return cachedGeoJSON
                    }

                    return
                })()

                if (!geojson) {
                    if (signal.aborted) return

                    delete geojsonLayer.cachedGeoJSON
                    
                    geojson = await fetchLibraryData(event, geojsonLayer, options={controller:abortController})
                    if (!geojson) {
                        if (!layerBounds) return
                        geojson = turf.featureCollection([turf.polygonToLine(layerBounds)])
                        geojson.prefix = 'Bounding'
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
                    
                    if ((mapScale && mapScale > 10000) || (!mapScale && mapZoom < 10)) {
                        if (featureCount > 1000) {
                            const boundsGeoJSON = L.rectangle(L.geoJSON(geojson).getBounds()).toGeoJSON()
                            const feature = turf.polygonToLine(boundsGeoJSON)
                            geojson.features = [feature]
                            geojson.prefix = 'Bounding'
                            
                            let totalMatched = 'features'
                            const numberMatched = geojson.numberMatched
                            const numberReturned = geojson.numberReturned
                            if (numberMatched && numberReturned && numberMatched !== numberReturned) {
                                totalMatched = `returned of ${formatNumberWithCommas(numberMatched)} matched features`
                            }
                            
                            geojson.suffix = `for ${formatNumberWithCommas(featureCount)} ${totalMatched}`
                        } else if (geojson.prefix !== 'Bounding') {
                            try {
                                if (signal.aborted) return
                                geojson = turf.simplify(geojson, { tolerance: 0.01 })
                                geojson.prefix = 'Simplified'
                            } catch {}
                        }
                    }
                    
                    if (signal.aborted) return
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
                geojson = turf.featureCollection([])
            }

            if (signal.aborted) return
            geojsonLayer.clearLayers()
            geojsonLayer.addData(geojson)
            
            if (geojsonLayer._openPopups.length > 0) {
                geojsonLayer._openPopups.forEach(popup => popup.openOn(map))
                geojsonLayer._openPopups = []
            }
            
            // geojsonLayer.eachLayer(feature => {
            //     if (signal.aborted) return
            //     feature.popupHeader = getLayerTitle
            // })
            
            let legend = {}
            geojsonLayer.eachLayer(feature => {
                if (signal.aborted) return

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

            if (signal.aborted) return
            geojsonLayer.data.layerLegendStyle = legend
            geojsonLayer.fire('legendUpdated')
        }
    
        let handlerTimeout
        const handlerOnTimeout = () => {
            clearTimeout(handlerTimeout);
            handlerTimeout = setTimeout(() => handler(abortController.signal), 1000);
        };
    
        const abortHandler = () => {
            abortController.abort('Map moved or layer removed');
            abortController = new AbortController();
        };
        
        map.on('moveend zoomend', handlerOnTimeout)
        map.on('movestart zoomstart', abortHandler);
        geojsonLayer.on('remove', () => {
            abortHandler()
            map.off('moveend zoomend', handlerOnTimeout)
            map.off('movestart zoomstart', abortHandler);
        });

        handlerOnTimeout()
    })

    return geojsonLayer
}

const createXYZTilesLayer = (data) => {
    return L.tileLayer(data.layerUrl)
}
