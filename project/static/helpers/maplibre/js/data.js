const fetchSearchNominatim = async (params, {
    abortBtns,
    controller,
} = {}) => {
    let q = params.q
    if (!q) return
    q = q.toLowerCase()

    const url = pushURLParams('https://nominatim.openstreetmap.org/search?', {
        q, format:'geojson', limit:params.limit ?? 100
    })

    const hashedParams = await hashJSON({params})
    const id = Array('nominatim', hashedParams).join('-')
    const geojson = (await getFromGISDB(id))?.gisData
    
    if (geojson?.features.length) {
        return geojson
    }

    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const geojson = await parseJSONResponse(response)
            if (geojson?.features?.length) {
                await saveToGISDB(geojson, {id})
            }
            return geojson
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchReverseNominatim = async ({
    queryGeom,
    zoom,
    abortBtns,
    controller,
} = {}) => {
    const [lon, lat] = turf.centroid(queryGeom).geometry.coordinates
    
    if (zoom > 18) zoom = 18
    zoom = Math.round(zoom)

    const url = pushURLParams('https://nominatim.openstreetmap.org/reverse?', {
        lat,
        lon,
        zoom,
        format: 'geojson',
        polygon_geojson: 1,
        polygon_threshold: 0,
    })

    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse

    }).catch(error => {
        console.log(error)
    })
}

const fetchWMSData = async (params, {style, abortBtns, controller, event} = {}) => {
    const map = event.target
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
        
        BBOX: map.getSettingsControl().getMapBbox(),
        WIDTH: map.getCanvas().width,
        HEIGHT: map.getCanvas().height,
        X: Math.floor(event.point.x),
        Y: Math.floor(event.point.y),
    }
    
    const styles = JSON.parse(params.styles ?? '{}')
    if (style && style in styles) {
        getParams.STYLES = style
    } else if (Object.keys(styles).length) {
        getParams.STYLES = Object.keys(styles)[0]
    }
    
    const url = pushQueryParamsToURLString(cleanURL, getParams)
    
    return await fetchTimeout(url, {
        abortBtns,
        controller,
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