const fetchSearchNominatim = async (params, {
    abortController,
    abortEvents,
}={}) => {
    const q = params.q?.toLowerCase()
    if (!q) return

    const url = 'https://nominatim.openstreetmap.org/search'
    const getParams = {q, format: 'geojson', limit: params.limit ?? 1000}

    const id = await hashJSON({url, ...getParams})
    const geojson = (await getFromGISDB(id))?.data
    
    if (geojson?.features?.length) {
        return geojson
    }

    return await customFetch(pushURLParams(url, getParams), {
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
    const lngLat = map.unproject(point)

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

        BBOX: map.getBbox(),
        WIDTH: map.getCanvas().width,
        HEIGHT: map.getCanvas().height,
        X: Math.floor(point.x),
        Y: Math.floor(point.y),
    })

    console.log(url)

    const callback = async (response) => {
        let data

        const contentType = response.headers.get('Content-Type')
        if (contentType.includes('json')) {
            data = await parseJSONResponse(response)
        } else if (contentType.includes('xml')) {
            data = await response.text().then(async xmlString => {
                const [namespace, rootElement] = parseXML(xmlString)
                
                if ((
                    rootElement.querySelector('ServiceException')
                    ?.textContent?.toLowerCase()
                    .includes('styles parameter is mandatory')
                )) return await customFetch(pushURLParams(url, {STYLES: params.style}), {
                    abortEvents, abortController, callback
                })

                if (namespace === 'http://www.esri.com/wms') {
                    return turf.featureCollection(Array.from(rootElement.childNodes).map(child => {
                        if (child.tagName?.toLowerCase() !== 'fields') return
                        
                        const attributes = Object.values(child.attributes)
                        if (attributes.length == 0) return
                        
                        return turf.point(
                            Object.values(lngLat),
                            Object.fromEntries(attributes.map(attr => [attr.name, attr.value]))
                        )
                    }).filter(Boolean))
                } else {
                    throw new Error('Content not supported.')
                }
            })
        }
        
        await normalizeGeoJSON(data)
        return data
    }

    return await customFetch(url, {
        abortEvents, abortController, callback,
    }).catch(error => {
        console.log(error)
    })
}