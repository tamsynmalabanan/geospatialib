const getDefaultGeoJSONLayer = (options={}) => {
    let color = options.color
    if (!color) {
        color = `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`
    }

    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        renderer: L.canvas(),
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

// const getGeoJSON = async (event) => {
//     const geojsonLayer = event.target
//     const map = event.target._map
//     const mapBounds = L.rectangle(map.getBounds()).toGeoJSON()
//     const layerBounds = data.layerBbox ? turf.bboxPolygon(data.layerBbox.slice(1, -1).split(',')) : null
//     const queryBounds = layerBounds ? turf.intersect(mapBounds, layerBounds) : mapBounds

//     let geojson

//     if (queryBounds) {
//         if (signal.aborted) return
//         geojson = await (async () => {
//             const cachedGeoJSONStrings = getLayersViaCacheKey(map, geojsonLayer.cacheKey)
//             .map(layer => layer.cachedGeoJSON)
//             .filter(cachedGeoJSONString => cachedGeoJSONString)                    
//             if (cachedGeoJSONStrings.length === 0) return
            
//             for (const cachedGeoJSONString of cachedGeoJSONStrings) {
//                 if (signal.aborted) return
                
//                 const cachedGeoJSON = JSON.parse(cachedGeoJSONString)
//                 if (!cachedGeoJSON) {continue}
//                 if (Array('Bounding', 'Simplified').includes(cachedGeoJSON.prefix)) {continue}
                
//                 try {
//                     const equalBounds = turf.booleanEqual(queryBounds, cachedGeoJSON.mapBounds)
//                     const withinBounds = turf.booleanWithin(queryBounds, cachedGeoJSON.mapBounds)
//                     if (!equalBounds && !withinBounds) {continue}
//                 } catch {
//                     return
//                 }
                
//                 if (!geojsonLayer.cachedGeoJSON) {
//                     geojsonLayer.cachedGeoJSON = cachedGeoJSONString
//                 }
                
//                 let filterBounds = L.rectangle(map.getBounds()).toGeoJSON()
//                 const crs = getGeoJSONCRS(cachedGeoJSON)
//                 if (crs && crs !== 4326) {
//                     if (signal.aborted) return
//                     filterBounds = await transformFeatureGeometry(filterBounds, 4326, crs)
//                 }
                
//                 cachedGeoJSON.features = cachedGeoJSON.features.filter(feature => {
//                     if (signal.aborted) return
//                     return turf.booleanIntersects(filterBounds, feature)
//                 })
                
//                 return cachedGeoJSON
//             }

//             return
//         })()

//         if (!geojson) {
//             if (signal.aborted) return

//             delete geojsonLayer.cachedGeoJSON
            
//             geojson = await fetchLibraryData(event, geojsonLayer, options={controller:abortController})
//             if (!geojson) {
//                 if (!layerBounds) return
//                 geojson = turf.featureCollection([turf.polygonToLine(layerBounds)])
//                 geojson.prefix = 'Bounding'
//             } else {
//                 geojson.mapBounds = mapBounds
//                 if (geojson.features.length > 0) {
//                     geojson.cachedGeoJSON = JSON.stringify(geojson)
//                 }
//             }
//         }
        
//         if (!geojson.processed) {
//             geojson.processed = true

//             const mapScale = getMeterScale(map)
//             const mapZoom = map.getZoom()    
//             const featureCount = geojson.features.length
            
//             if ((mapScale && mapScale > 100000) || (!mapScale && mapZoom < 6)) {
//                 if (featureCount > 10000) {
//                     const boundsGeoJSON = L.rectangle(L.geoJSON(geojson).getBounds()).toGeoJSON()
//                     const feature = turf.polygonToLine(boundsGeoJSON)
//                     geojson.features = [feature]
//                     geojson.prefix = 'Bounding'
                    
//                     let totalMatched = 'features'
//                     const numberMatched = geojson.numberMatched
//                     const numberReturned = geojson.numberReturned
//                     if (numberMatched && numberReturned && numberMatched !== numberReturned) {
//                         totalMatched = `returned of ${formatNumberWithCommas(numberMatched)} matched features`
//                     }
                    
//                     geojson.suffix = `for ${formatNumberWithCommas(featureCount)} ${totalMatched}`
//                 } else if (geojson.prefix !== 'Bounding') {
//                     try {
//                         if (signal.aborted) return
//                         geojson = turf.simplify(geojson, { tolerance: 0.01 })
//                         geojson.prefix = 'Simplified'
//                     } catch {}
//                 }
//             }
            
//             if (signal.aborted) return
//             await handleGeoJSON(geojson)
//         }

//         if (!geojsonLayer.cachedGeoJSON && geojson.cachedGeoJSON) {
//             if (Array('Bounding', 'Simplified').includes(geojson.prefix)) {
//                 geojsonLayer.cachedGeoJSON = geojson.cachedGeoJSON
//             } else {
//                 geojsonLayer.cachedGeoJSON = JSON.stringify(geojson)
//             }
//         }
//     } else {
//         geojson = turf.featureCollection([])
//     }
// }