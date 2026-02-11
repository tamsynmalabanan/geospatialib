const fetchSearchNominatim = async (params, {
    abortController,
    abortEvents,
}={}) => {
    const q = params.q?.toLowerCase()
    if (!q) return

    const url = pushURLParams('https://nominatim.openstreetmap.org/search?', {
        q, format:'geojson', limit:params.limit ?? 1000
    })

    const id = Array('nominatim', (await hashJSON({url}))).join('-')
    const geojson = (await getFromGISDB(id))?.data
    
    if (geojson?.features?.length) {
        return geojson
    }

    return await customFetch(url, {
        id,
        abortController,
        abortEvents,
        callback: async (response) => {
            const data = await parseJSONResponse(response, {id})
            if (data?.features?.length) {
                await normalizeGeoJSON(data)
                updateGISDB(id, {data})
            }
            return data
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchReverseNominatim = async ({
    geom,
    zoom,
    abortController,
    abortEvents,
} = {}) => {
    const [lon, lat] = turf.centroid(geom).geometry.coordinates
    
    if (zoom > 18) zoom = 18
    zoom = Math.round(zoom)

    const url = pushURLParams('https://nominatim.openstreetmap.org/reverse?', {
        lat, lon, zoom,
        format: 'geojson',
        polygon_geojson: 1,
        polygon_threshold: 0,
    })

    return await customFetch(url, {
        abortEvents,
        abortController,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchWMSData = async (params, {
    map, 
    point,
    abortEvents, 
    abortController, 
} = {}) => {
    const url = pushURLParams(params.url, {
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        FORMAT: 'application/json',
        INFO_FORMAT: 'application/json',
        exceptions: 'application/vnd.ogc.se_inimage',
        SRS: "EPSG:4326",
        CRS: 'EPSG:4326',
        TRANSPARENT: true,
        
        QUERY_LAYERS: params.name,
        LAYERS: params.name,
        STYLES: params.style,
        
        BBOX: normalizeBbox(map.getBounds().toArray().flatMap(i => i)),
        WIDTH: map.getCanvas().width,
        HEIGHT: map.getCanvas().height,
        X: Math.floor(point.x),
        Y: Math.floor(point.y),
    })
    
    return await customFetch(url, {
        abortEvents,
        abortController,
        callback: async (response) => {
            const contentType = response.headers.get('Content-Type')
            if (contentType.includes('json')) {
                try {
                    return parseJSONResponse(response)
                } catch {
                    throw new Error('Failed to parse JSON.')
                }
            } else if (contentType.includes('xml')) {
                return response.text().then(xmlString => {
                    const features = []

                    const [namespace, rootElement] = parseXML(xmlString)
                    if (namespace === 'http://www.esri.com/wms') {
                        const lngLat = map.unproject(point)
                        
                        rootElement.childNodes.forEach(child => {
                            const tagName = child.tagName?.toLowerCase()
                            if (tagName.toLowerCase() !== 'fields') return
                            
                            const attributes = Object.values(child.attributes)
                            if (attributes.length == 0) return
                            
                            features.push(turf.point(
                                Object.values(lngLat),
                                Object.fromEntries(attributes.map(attr => {
                                    return [attr.name, attr.value]
                                }))
                            ))
                        })
                    } else {
                        throw new Error('Content not supported.')
                    }
                    
                    return turf.featureCollection(features)
                })
            }
        }
    }).catch(error => {
        console.log(error)
    })
}