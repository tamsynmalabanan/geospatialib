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
                await updateGISDB(id, {data})
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
    style, 
    abortEvents, 
    abortController, 
} = {}) => {
    const cleanURL = removeQueryParams(params.url)

    const getParams = {
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        FORMAT: 'application/json',
        INFO_FORMAT: 'application/json',
        TRANSPARENT: true,
        QUERY_LAYERS: params.name,
        LAYERS: params.name,
        exceptions: 'application/vnd.ogc.se_inimage',
        SRS: "EPSG:4326",
        CRS: 'EPSG:4326',
        
        BBOX: map._settingsControl.getMapBbox(),
        WIDTH: map.getCanvas().width,
        HEIGHT: map.getCanvas().height,
        X: Math.floor(point.x),
        Y: Math.floor(point.y),
    }
    
    const styles = JSON.parse(params.styles ?? '{}')
    if (style && style in styles) {
        getParams.STYLES = style
    } else if (Object.keys(styles).length) {
        getParams.STYLES = Object.keys(styles)[0]
    }
    
    const url = pushQueryParamsToURLString(cleanURL, getParams)
    
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
                return response.text()
                .then(xmlString => {
                    const features = []

                    const [namespace, rootElement] = parseXML(xmlString)
                    if (namespace === 'http://www.esri.com/wms') {
                        rootElement.childNodes.forEach(child => {
                            const tagName = child.tagName
                            if (!tagName || tagName.toLowerCase() !== 'fields') return
                            
                            const attributes = Object.values(child.attributes)
                            if (attributes.length == 0) return
                            
                            const feature = {type: "Feature", properties:{}}
                            attributes.forEach(attr => feature.properties[attr.name] = attr.value)
                            features.push(feature)
                        })
                    }
                    
                    return geojson = turf.featureCollection(features)
                })
            }
        }
    }).catch(error => {
        console.log(error)
    })
}