const updateGeoJSONDataWorker = new Worker('worker/geojson-update-data.js');
// updateGeoJSONDataWorker.onmessage = function (e) {
//     console.log(e);
// };

const getDefaultGeoJSONLayer = (options={}) => {
    let color = options.color
    if (!color) {
        color = `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`
    }

    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        pointToLayer: (geoJsonPoint, latlng) => {
            return L.marker(latlng, {icon:getDefaultLayerStyle('point', {color:color})})
        },
        style: (geoJsonFeature) => {
            const params = {color:color}

            if (options.fillColor) {
                params.fillColor = options.fillColor
            }

            if (options.weight) {
                params.weight = options.weight
            }

            return getDefaultLayerStyle('other', params)
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

const updateGeoJSONData = async (event) => {
    updateGeoJSONDataWorker.postMessage({ type: 'geojson-update', data: 'Test' });
    
    const geojsonLayer = event.target
    const data = geojsonLayer.data

    const controller = geojsonLayer.abortController
    const signal = controller.signal
    
    const map = geojsonLayer._map
    const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
    const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
    
    const queryBounds = layerBounds ? turf.intersect(mapBounds, layerBounds) : mapBounds
    if (!queryBounds) return turf.featureCollection([])

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
    
    if (!geojson.processed && !geojson.prefix) {
        if (signal.aborted) return
        geojson.features.length > 100 && simplifyGeoJSON(geojson, map)
        
        if (signal.aborted) return
        await handleGeoJSON(geojson)
        geojson.processed = true
    }

    if (signal.aborted) return
    if (!geojsonLayer.cachedGeoJSON && geojson.cachedGeoJSON) {
        geojsonLayer.cachedGeoJSON = geojson.prefix ? geojson.cachedGeoJSON : JSON.stringify(geojson)
    }

    if (signal.aborted) return
    geojsonLayer.clearLayers()
    geojsonLayer.addData(geojson)

    return geojson
}

const simplifyGeoJSON = (geojson, map) => {
    const pointsGeoJSON = turf.featureCollection([])
    const pathsGeoJSON = turf.featureCollection([])

    geojson.features.forEach(feature => {
        feature.geometry.type.toLowerCase().includes('point') 
        ? pointsGeoJSON.features.push(feature) 
        : pathsGeoJSON.features.push(feature)
    })

    pointsGeoJSON.features.length > 0 && simplifyPointGeoJSON(pointsGeoJSON, getMeterScale(map)/1000/10)
    pathsGeoJSON.features.length > 0 && simplifyPathGeoJSON(pathsGeoJSON)

    geojson.features = pointsGeoJSON.features.concat(pathsGeoJSON.features)
    geojson.prefix = Array(pointsGeoJSON, pathsGeoJSON).map(gj => gj.prefix).filter(prefix => prefix).join('/')
}

const simplifyPointGeoJSON = (geojson, maxDistance) => {
    console.log('start')
    turf.clustersDbscan(geojson, maxDistance, {
        mutate: true,
        minPoints: 2
    })
    
    console.log('done creating clusters...')
    
    const features = geojson.features.filter(feature => feature.properties.dbscan === 'noise')
    turf.clusterEach(geojson, 'cluster', (cluster, clusterValue, currentIndex) => {
        features.push(turf.centroid(cluster, {
            properties: {
                cluster: clusterValue,
                count: cluster.features.length
            }
        }))
    })
    
    console.log('done aggregating...')
    
    geojson.features = features
    geojson.prefix = 'Aggregate'
    console.log('end', geojson)
}

const simplifyPathGeoJSON = (geojson) => {
    turf.simplify(geojson, {
        tolerance: 0.01,
        mutate: true,
    })
    geojson.prefix = 'Simplified'
}