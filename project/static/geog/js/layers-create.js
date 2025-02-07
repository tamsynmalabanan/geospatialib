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
    data.layerLegendStyle = !data.layerLegendStyle ? "true" : data.layerLegendStyle

    const geojsonLayer = getDefaultGeoJSONLayer()
    geojsonLayer.popupHeader = () => geojsonLayer.data.legendLabel || geojsonLayer.data.layerTitle    
    geojsonLayer.abortController = new AbortController()
        
    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })
    
    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('dataUpdated', (event) => {
        const geojson = event.geojson
        const signal = geojsonLayer.abortController.signal

        if (geojsonLayer._openPopups.length > 0) {
            geojsonLayer._openPopups.forEach(popup => popup.openOn(geojsonLayer._map))
            geojsonLayer._openPopups = []
        }
        
        let legend = {}
        geojsonLayer.eachLayer(layer => {
            if (signal.aborted) return

            const properties = layer.feature.properties

            const type = (() => {
                const featureType = layer.feature.geometry.type.replace('Multi', '')
                if (geojson.prefix === 'Bounding') return 'Box'
                if (geojson.prefix === 'Cluster' && featureType === 'Polygon') return 'Area'
                return featureType
            })()

            const group = (() => {
                const parts = {
                    prefix: geojson.prefix,
                    type: type,
                    suffix: geojson.suffix,
                }
                
                if (geojson.prefix === 'Cluster' && properties.dbscan === 'noise') delete parts.prefix
                
                return Object.values(parts).filter(part => part).join(' ')
            })()
            
            if (!Object.keys(legend).includes(group)) {
                legend[group] = {
                    label: group,
                    type: type,
                    style: type === 'Point' ? layer.options.icon : geojsonLayer.options.style(),
                    count: geojson.prefix === 'Cluster' && properties.dbscan !== 'noise' ? properties.count : 1,
                }
                if (type === 'Polygon') {
                    console.log(geojsonLayer.options.style())
                }
            } else {
                legend[group].count += geojson.prefix === 'Aggregate' && properties.dbscan !== 'noise' ? properties.count : 1
            }
        })

        geojsonLayer.data.layerLegendStyle = legend
        geojsonLayer.fire('legendUpdated')
    })

    geojsonLayer.on('add', (event) => {
        const map = event.target._map
    
        let handlerTimeout
        const handler = async () => {
            clearTimeout(handlerTimeout)
            handlerTimeout = setTimeout(async () => {
                if (map.hasHiddenLayer(geojsonLayer)) return

                geojsonLayer.fire('fetchingData')
                const geojson = await getGeoJSONData(event)
                if (!geojson) return
                
                geojsonLayer.clearLayers()
                geojsonLayer.addData(geojson)
                geojsonLayer.fire('dataUpdated', {geojson})         
            }, 1000)
        }

        const abortHandler = () => {
            geojsonLayer.abortController.abort('Map moved or layer removed');
            geojsonLayer.abortController = new AbortController();
        };

        const clearHandlers = () => {
            // abortHandler()
            map.off('moveend zoomend', handler)
            map.off('movestart zoomstart', abortHandler);
            geojsonLayer.off('remove', clearHandlers)
        }
        
        handler()
        map.on('moveend zoomend', handler)
        map.on('movestart zoomstart', abortHandler);
        geojsonLayer.on('remove', clearHandlers);
    })

    return geojsonLayer
}

const createXYZTilesLayer = (data) => {
    return L.tileLayer(data.layerUrl)
}
