onmessage = async (message) => {
    console.log(message)

    const event = message.data
    const geojsonLayer = event.target
    const data = geojsonLayer.data

    const controller = geojsonLayer.abortController
    const signal = controller.signal
    
    const map = geojsonLayer._map
    const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
    const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
    
    const queryBounds = layerBounds ? turf.intersect(mapBounds, layerBounds) : mapBounds
    if (!queryBounds) return turf.featureCollection([])

    console.log('fetching...')

    let geojson

    if (signal.aborted) return
    geojson = await (async () => {
        const cachedGeoJSONStrings = getLayersViaCacheKey(map, geojsonLayer.cacheKey)
        .map(layer => layer.cachedGeoJSON)
        .filter(cachedGeoJSONString => cachedGeoJSONString)                    
        if (cachedGeoJSONStrings.length === 0) return
        
        for (const cachedGeoJSONString of cachedGeoJSONStrings) {
            if (signal.aborted) return
            
            const cachedGeoJSON = JSON.parse(cachedGeoJSONString)
            if (!cachedGeoJSON) {continue}
            
            if (cachedGeoJSON.prefix) {continue}
            
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
    })()

    if (signal.aborted) return
    if (!geojson) {
        delete geojsonLayer.cachedGeoJSON
        geojson = await fetchLibraryData(event, geojsonLayer, options={controller:controller})
        if (!geojson) {
            if (!layerBounds) return
            geojson = turf.featureCollection([turf.polygonToLine(layerBounds)])
            geojson.prefix = 'Bounding'
        } else {
            geojson.mapBounds = mapBounds
            if (geojson.features.length > 0) {
                if (signal.aborted) return
                geojson.cachedGeoJSON = JSON.stringify(geojson)
            }
        }
    }
    
    console.log('fetch', geojson.features.length)
    console.log('processing...')

    if (!geojson.processed && !geojson.prefix) {
        if (signal.aborted) return

        geojson.features.length > 100 && simplifyGeoJSON(geojson, map)
        
        if (signal.aborted) return
        await handleGeoJSON(geojson)
        geojson.processed = true
    }

    console.log('done processing', geojson.features.length)
    console.log('caching...')

    if (signal.aborted) return
    if (!geojsonLayer.cachedGeoJSON && geojson.cachedGeoJSON) {
        geojsonLayer.cachedGeoJSON = geojson.prefix ? geojson.cachedGeoJSON : JSON.stringify(geojson)
    }

    console.log('done caching')

    if (signal.aborted) return
    geojsonLayer.clearLayers()
    geojsonLayer.addData(geojson)
    geojsonLayer.fire('dataUpdated', {geojson})
};