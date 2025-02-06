const getDefaultGeoJSONLayer = (options={}) => {
    let color = options.color
    if (!color) {
        color = `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`
    }

    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pointToLayer: (geoJsonPoint, latlng) => {
            return L.marker(latlng, {icon:getDefaultLayerStyle('point', {
                color:color,
                colorOpacity:0.5,
            })})
        },
        style: (geoJsonFeature) => {
            return getDefaultLayerStyle('other', {
                color: color,
                fillColor: options.fillColor,
                weight: options.weight,
            })
        },
    })

    const pane = options.pane
    if (pane) {
        geojsonLayer.options.pane = pane
    }

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const pane = geojsonLayer.options.pane
        if (pane) {
            layer.options.pane = pane
        }

        if (options.getTitleFromLayer) {
            layer.title = getLayerTitle(layer)
        }

        if (options.bindTitleAsTooltip) {
            layer.bindTooltip(layer.title, {sticky:true})
        }

        if (Object.keys(feature.properties).length > 0) {
            const createPopup = () => {
                const popupHeader = layer.popupHeader || geojsonLayer.popupHeader
                const propertiesTable = createFeaturePropertiesTable(feature.properties, {
                        header: typeof popupHeader === 'function' ? (() => {
                            layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = popupHeader())
                            return popupHeader()
                        })() : popupHeader
                })
                
                layer.bindPopup(propertiesTable.outerHTML, {
                    autoPan: false,
                }).openPopup()
                
                layer.off('click', createPopup)
            }

            layer.on('click', createPopup)
        }
    }

    options.geojson && geojsonLayer.addData(options.geojson)

    return geojsonLayer
}

const transformFeatureGeometry = async (feature, source, target) => {
    const coords = feature.geometry.coordinates
    feature.geometry.coordinates = await transformCoordinates(coords, source, target)
    return feature
}

const downloadGeoJSON = (geojson, file_name) => {
    const blob = new Blob([geojson], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file_name}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const updateGeoJSONDataWorker = new Worker("/static/geog/js/geojson-update-data-worker.js");
// updateGeoJSONDataWorker.onmessage = (event) => {
//   console.log('Message received from worker:', event.data);
// };

const updateGeoJSONDataMap = new Map()
const updateGeoJSONData = async (event) => {
    const geojsonLayer = event.target
    const data = geojsonLayer.data
    const map = geojsonLayer._map
    if (!geojsonLayer || !data || !map) return

    const mapKey = getLayerMapKey(geojsonLayer)
    if (updateGeoJSONDataMap.has(mapKey)) {
        return await updateGeoJSONDataMap.get(mapKey)
    }

    const geojsonPromise = (async () => {
        const controller = geojsonLayer.abortController
        const signal = controller.signal
        
        const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
        const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
        
        const queryBounds = layerBounds ? turf.intersect(mapBounds, layerBounds) : mapBounds
        if (!queryBounds) return turf.featureCollection([])
    
        let geojson
    
        if (signal.aborted) return
        geojson = await (async () => {
            const cachedGeoJSON = await getFromGeoJSONDB(mapKey)
            if (!cachedGeoJSON) return
            
            if (cachedGeoJSON.prefix) return
            
            try {
                const equalBounds = turf.booleanEqual(queryBounds, cachedGeoJSON.mapBounds)
                const withinBounds = turf.booleanWithin(queryBounds, cachedGeoJSON.mapBounds)
                if (!equalBounds && !withinBounds) return
            } catch (error) {
                return
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
            
            if (cachedGeoJSON.features.length === 0) return
            cachedGeoJSON.fromIndexedDB = true
            return cachedGeoJSON
        })()
    
        if (signal.aborted) return
        if (!geojson) {
            deleteFromGeoJSONDB(mapKey) // instead of deleting and saving a new geojson, update existing geojson

            geojson = await fetchLibraryData(event, geojsonLayer, options={controller:controller})
            if (!geojson) {
                if (!layerBounds) return
                geojson = turf.featureCollection([turf.polygonToLine(layerBounds)])
                geojson.prefix = 'Bounding'
            } else {
                if (signal.aborted) return
                geojson.mapBounds = mapBounds
                geojson.features.length > 0 && saveToGeoJSONDB(mapKey, Object.assign({}, geojson))
            }
        }

        if (!geojson.preprocess && !geojson.prefix) {
            if (signal.aborted) return
            const mapScale = getMeterScale(map) || mapZoomToMeter(map)
            geojson.features.length > 100 && mapScale > 10000 && await simplifyGeoJSON(geojson, mapScale)
            
            if (signal.aborted) return
            await preprocessGeoJSON(geojson)

            !geojson.fromIndexedDB && !geojson.prefix && saveToGeoJSONDB(mapKey, Object.assign({}, geojson))
        }     

        return geojson
    })().finally(() => updateGeoJSONDataMap.delete(mapKey))
    
    updateGeoJSONDataMap.set(mapKey, geojsonPromise)
    return geojsonPromise
}

const simplifyGeoJSON = async (geojson, mapScale) => {
    const pointsGeoJSON = turf.featureCollection([])
    const pathsGeoJSON = turf.featureCollection([])

    geojson.features.forEach(feature => {
        feature.geometry.type.toLowerCase().includes('point') 
        ? pointsGeoJSON.features.push(feature) 
        : pathsGeoJSON.features.push(feature)
    })

    pointsGeoJSON.features.length > 0 && simplifyPointGeoJSON(pointsGeoJSON, mapScale/1000/10)
    pathsGeoJSON.features.length > 0 && simplifyPathGeoJSON(pathsGeoJSON)

    geojson.features = pointsGeoJSON.features.concat(pathsGeoJSON.features)
    geojson.prefix = Array(pointsGeoJSON, pathsGeoJSON).map(gj => gj.prefix).filter(prefix => prefix).join('/')

    return geojson
}

const simplifyPointGeoJSON = (geojson, maxDistance) => {
    turf.clustersDbscan(geojson, maxDistance, {
        mutate: true,
        minPoints: 2
    })
        
    const features = geojson.features.filter(feature => feature.properties.dbscan === 'noise')
    if (features.length === geojson.features.length) return

    turf.clusterEach(geojson, 'cluster', (cluster, clusterValue, currentIndex) => {
        features.push(turf.centerMean(cluster, {
            properties: {
                cluster: clusterValue,
                count: cluster.features.length
            }
        }))
    })
        
    geojson.features = features
    geojson.prefix = 'Aggregate'
}

const simplifyPathGeoJSON = (geojson) => {
    turf.simplify(geojson, {
        tolerance: 0.01,
        mutate: true,
    })
    geojson.prefix = 'Simplified'
}