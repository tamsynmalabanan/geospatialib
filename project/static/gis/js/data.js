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
    }).catch(error => {})
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
        // console.log(error)
    })
}

const parseXMLResponse = async (response, {
    lngLat,
    exceptionHandler
}={}) => {
    return await response.text().then(async xmlString => {
        const [namespace, rootElement] = parseXML(xmlString)
        
        const serviceException = rootElement.querySelector('ServiceException')
        if (serviceException) {
            return exceptionHandler(serviceException)
        }

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

const fetchWMSData = async (params, {
    map, 
    point,
    abortEvents, 
    abortController, 
} = {}) => {
    const url = pushURLParams(params.url, {
        ...params.get,

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

    const callback = async (response) => {
        let data

        const contentType = response.headers.get('Content-Type')
        if (contentType.includes('json')) {
            data = await parseJSONResponse(response)
        } else if (contentType.includes('xml')) {
            data = await parseXMLResponse(response, {
                lngLat: map.unproject(point),
                exceptionHandler: async (ex) => {
                    if ((ex.textContent?.toLowerCase().includes('styles parameter is mandatory'))) {
                        return await customFetch(pushURLParams(url, {STYLES: params.style}), {
                            abortEvents, abortController, callback
                        })
                    }
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

const fetchWFSData = async (params, {map, point, id, abortEvents, abortController} = {}) => {
    const lngLat = point ? map?.unproject(point) : null
    const extent = turf.envelope(lngLat ? turf.buffer(
        turf.point(lngLat), map.controlsHandler.getScaleInMeters()/1000, {units: 'meters'}
    ) : map?.bboxToGeoJSON() ?? turf.bboxPolygon([-180, -90, 180, 90]))

    if (!id) id = await hashJSON(params)
    
    const geojson = (await getFromGISDB(id, {filter:extent}))?.data
    if (geojson?.features?.length) {
        return geojson
    }
    
    const srsname = `urn:ogc:def:crs:EPSG::4326`
    const [w,s,e,n] = turf.bbox(extent)

    const url = pushURLParams(params.url, {
        ...params.get,
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: params.name,
        srsname,
        bbox: [s,w,n,e,srsname],
        outputFormat: 'json',
    })

    return await customFetch(url, {
        abortEvents,
        abortController,
        callback: async (response) => {
            let data

            const contentType = response.headers.get('Content-Type')
            if (contentType.includes('json')) {
                data = await parseJSONResponse(response, {id})
            } else if (contentType.includes('xml')) {
                data = await parseXMLResponse(response, {lngLat})
            }
            
            if (data?.features?.length) {
                await normalizeGeoJSON(data)
                updateGISDB(id, {data, params, extent})
            }
            
            return data
        }
    }).catch(error => {
        console.log(error)
    })
}