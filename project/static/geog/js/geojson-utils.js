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

const downloadGeoJSON = (geojson, fileName) => {
    const blob = new Blob([geojson], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const getGeoJSONDataMap = new Map()
const getGeoJSONData = async (event) => {
    const geojsonLayer = event.target
    const data = geojsonLayer.data
    const map = geojsonLayer._map
    if (!geojsonLayer || !data || !map) return

    const layerKey = getLayerKey(geojsonLayer)
    const mapKey = `${map.getContainer().id}:${layerKey}`
    if (getGeoJSONDataMap.has(mapKey)) {
        return await getGeoJSONDataMap.get(mapKey)
    }

    const geojsonPromise = (async () => {
        const controller = geojsonLayer.abortController
        const signal = controller.signal
        
        const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
        const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
        
        const queryBounds = layerBounds ? turf.intersect(turf.featureCollection([mapBounds, layerBounds])) : mapBounds
        if (!queryBounds) return turf.featureCollection([])
    
        let geojson
    
        if (signal.aborted) return
        geojson = await (async () => {
            const cachedGeoJSON = await getFromGeoJSONDB(layerKey)
            if (!cachedGeoJSON) return
            const clone = turf.clone(cachedGeoJSON) // Object.assign({}, cachedGeoJSON)

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
            saveToGeoJSONDB(layerKey, clone)
            return cachedGeoJSON
        })()
    
        if (!geojson) {
            if (signal.aborted) return
            geojson = await fetchLibraryData(event, geojsonLayer, options={controller:controller})
            
            if (geojson) {
                if (geojson.features.length > 0) {
                    geojson.mapBounds = mapBounds
                    
                    if (signal.aborted) return
                    await handleGeoJSON(geojson)
                    
                    const clone = turf.clone(geojson)
                    await updateGeoJSONOnDB(layerKey, {
                        type: clone.type,
                        features: clone.features,
                        mapBounds: clone.mapBounds,
                    })
                }
            } else {
                if (!layerBounds) return
                geojson = turf.featureCollection([turf.polygonToLine(layerBounds)])
                geojson.prefix = 'Bounding'
                return geojson
            }
        }

        if (signal.aborted) return
        const mapScale = getMeterScale(map) || mapZoomToMeter(map)
        console.log('simplifying')
        geojson.features.length > 100 && mapScale > 10000 && await simplifyGeoJSON(geojson, map)
        console.log('done simplifying')

        return geojson
    })().finally(() => getGeoJSONDataMap.delete(mapKey))
    
    getGeoJSONDataMap.set(mapKey, geojsonPromise)
    return geojsonPromise
}

const simplifyGeoJSON = async (geojson, map) => {
    const pointsGeoJSON = turf.featureCollection([])
    const pathsGeoJSON = turf.featureCollection([])

    geojson.features.forEach(feature => {
        feature.geometry.type.toLowerCase().includes('point') 
        ? pointsGeoJSON.features.push(feature) 
        : pathsGeoJSON.features.push(feature)
    })

    if (pointsGeoJSON.features.length > 0) {
        const mapZoom = map.getZoom()
        if (mapZoom < 9) {
            const mapScale = getMeterScale(map) || mapZoomToMeter(map)
            const maxDistance = mapScale / 1000 / ((9-mapZoom) * 10)
            simplifyPointGeoJSON(pointsGeoJSON, maxDistance, {polygonizeClusters:true})
        }
    }

    pathsGeoJSON.features.length > 0 && simplifyPathGeoJSON(pathsGeoJSON)

    geojson.features = pointsGeoJSON.features.concat(pathsGeoJSON.features)
    geojson.prefix = Array(pointsGeoJSON, pathsGeoJSON).map(gj => gj.prefix).filter(prefix => prefix).join('/')

    return geojson
}

const getBoundingCircle = (geojson, options={}) => {
    const bbox = turf.bbox(geojson)
    const bboxPolygon = turf.bboxPolygon(bbox)
    const centroid = turf.centroid(bboxPolygon)

    const corners = [
        turf.point([bbox[0], bbox[1]]),
        turf.point([bbox[0], bbox[3]]),
        turf.point([bbox[2], bbox[1]]),
        turf.point([bbox[2], bbox[3]]),
    ]
    
    const distances = corners.map(corner => turf.distance(centroid, corner, { units: 'kilometers' }))
    const maxDistance = Math.max(...distances)
    return turf.circle(centroid.geometry.coordinates, maxDistance, {
        units: 'kilometers',
        steps: options.steps || 64,
    })
}

const simplifyPointGeoJSON = (geojson, maxDistance, options={}) => {
    try {
        turf.clustersDbscan(geojson, maxDistance, {
            mutate: true,
            minPoints: 2
        })
        
        const features = geojson.features.filter(feature => feature.properties.dbscan === 'noise')
        if (features.length === geojson.features.length) return
        
        turf.clusterEach(geojson, 'cluster', (cluster, clusterValue, currentIndex) => {
            const clusterFeature = options.polygonizeClusters ? getBoundingCircle(cluster) : turf.centroid(cluster)
            clusterFeature.properties ={
                cluster: clusterValue,
                count: cluster.features.length
            }
            features.push(clusterFeature)
        })
        
        geojson.features = features
        geojson.prefix = 'Cluster'
    } catch {
        return
    }
}

const simplifyPathGeoJSON = (geojson) => {
    try {
        turf.simplify(geojson, {
            tolerance: 0.01,
            mutate: true,
        })
    
        geojson.prefix = 'Simplified'
    } catch {
        return
    }
}

const featuresAreSimilar = (feature1, feature2) => {
    const propertiesEqual = JSON.stringify(feature1.properties) === JSON.stringify(feature2.properties)
    const geometriesEqual = turf.booleanEqual(feature1.geometry, feature2.geometry)
    return propertiesEqual && geometriesEqual
}

const hasSimilarFeature = (featureList, targetFeature) => {
    for (const feature of featureList) {
        if (featuresAreSimilar(feature, targetFeature)) {
            return true
        }
    }
    return false
}