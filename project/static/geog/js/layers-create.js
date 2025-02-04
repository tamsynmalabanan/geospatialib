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
    console.log(data)
    data.layerLegendStyle = !data.layerLegendStyle ? "true" : data.layerLegendStyle

    const geojsonLayer = getDefaultGeoJSONLayer()
    geojsonLayer.popupHeader = () => geojsonLayer.data.legendLabel || geojsonLayer.data.layerTitle    
    geojsonLayer.cacheKey = `${data.layerUrl}_${data.layerFormat}_${data.layerName}`
        
    geojsonLayer._openPopups = []
    geojsonLayer.on('popupopen', (event) => {
        geojsonLayer._openPopups.push(event.popup)
    })
    
    geojsonLayer.on('popupclose', (event) => {
        geojsonLayer._openPopups = geojsonLayer._openPopups.filter(popup => popup !== event.popup)
    })
    
    geojsonLayer.on('add', (event) => {
        const map = event.target._map
        geojsonLayer.abortController = new AbortController()
    
        const handler = async () => {
            const signal = geojsonLayer.abortController.signal
            
            if (isHiddenInLegend(geojsonLayer, map)) return
            
            if (signal.aborted) return
            geojsonLayer.fire('fetchingData')
           
            if (signal.aborted) return
            const geojson = await getGeoJSON(event)

            if (signal.aborted) return
            geojsonLayer.clearLayers()
            geojsonLayer.addData(geojson)
            
            if (geojsonLayer._openPopups.length > 0) {
                geojsonLayer._openPopups.forEach(popup => popup.openOn(map))
                geojsonLayer._openPopups = []
            }
            
            let legend = {}
            geojsonLayer.eachLayer(feature => {
                if (signal.aborted) return

                const type = geojson.prefix === 'Bounding' ? 'Box' : feature.feature.geometry.type.replace('Multi', '')
                const group = type === 'Point' ? type : Array(geojson.prefix, type, geojson.suffix).filter(part => part).join(' ')
                
                if (!Object.keys(legend).includes(group)) {
                    const style = type === 'Point' ? geojsonLayer.options.pointToLayer().options.icon : geojsonLayer.options.style()
                    legend[group] = {
                        label: group,
                        type: type,
                        style: style,
                        count: 1,
                    }
                } else {
                    legend[group].count += 1 
                }
            })

            if (signal.aborted) return
            geojsonLayer.data.layerLegendStyle = legend
            geojsonLayer.fire('legendUpdated')
        }
        
        const abortHandler = () => {
            geojsonLayer.abortController.abort('Map moved or layer removed');
            geojsonLayer.abortController = new AbortController();
        };
        
        map.on('moveend zoomend', handler)
        map.on('movestart zoomstart', abortHandler);
        geojsonLayer.on('remove', () => {
            abortHandler()
            map.off('moveend zoomend', handler)
            map.off('movestart zoomstart', abortHandler);
        });

        handler()
    })

    return geojsonLayer
}

const createXYZTilesLayer = (data) => {
    return L.tileLayer(data.layerUrl)
}
