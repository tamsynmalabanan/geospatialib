const fetchReverseNominatim = async ({
    queryGeom,
    zoom,
    abortBtns,
    controller,
} = {}) => {
    const [lon, lat] = turf.centroid(queryGeom).geometry.coordinates
    
    if (zoom > 18) {
        zoom = 18
    }
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

const cleanOverpassTags = (tags) => {
    if (tags === '') return tags

    if (!tags.includes('[') || !tags.includes(']')) {
        tags = tags.startsWith('[') ? tags : `[${tags}`
        tags = tags.endsWith(']') ? tags : `${tags}]`
    }

    if (!tags.includes('"')) {
        tags = tags.split(/([\[\]=~]|, ?i)/).filter(Boolean)
        tags = tags.map(i => {
            i = i.trim()
            if (['[', ']', '=', '~', ',i'].includes(i)) return i
            if ([', i'].includes(i)) return i.replace(' ', '')
    
            i = i.startsWith('"') ? i : `"${i}`
            i = i.endsWith('"') ? i : `${i}"`
            return i
        })
        tags = tags.join('')
    }

    return tags
}

const ALL_OVERPASS_ELEMENT_TYPES = ['node','way','relation']

const getOverpassQueryBlock = (queryGeom, {
    zoom=5, 
    types=ALL_OVERPASS_ELEMENT_TYPES,
    tags='',
}={}) => {
    let params

    if (turf.getType(queryGeom) === 'Point') {
        const [lon, lat] = turf.centroid(queryGeom).geometry.coordinates
        const buffer = leafletZoomToMeter(zoom)/2
        params = `around:${buffer},${lat},${lon}`
    } else {
        const [w,s,e,n] = turf.bbox(queryGeom)
        params = s + ',' + w + ',' + n + ',' + e
    }

    const query = `(
        ${types.map(type => `${type}${cleanOverpassTags(tags)}(${params});`).join('')}
    );`

    return query
}

const mapForFetchOverpass = new Map()
let fetchOverpassIsActive = false
const fetchOverpass = async (params, {
    queryGeom,
    zoom,
    abortBtns,
    controller,
    query = getOverpassQueryBlock(queryGeom, {zoom, ...params}),
} = {}) => {
    const url = 'https://overpass-api.de/api/interpreter'
    const body = "data="+encodeURIComponent(`[out:json][timeout:${60*10}];${query}out tags geom body;`)
    
    console.log(Array(url, body).join('?'))

    const mapKey = canonicalize({body, controller:controller?.id})
    if (mapForFetchOverpass.has(mapKey)) {
        return mapForFetchOverpass.get(mapKey)
    }

    while (fetchOverpassIsActive && !controller?.signal.aborted) {
        await new Promise(res => setTimeout(res, 1000))
    }
    
    if (controller?.signal.aborted) return
    fetchOverpassIsActive = true


    console.log(Array(url, body).join('?'))

    const fetchPromise = fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const data = await parseJSONResponse(response)
            return data ? osmtogeojson(data) : null
        },
        fetchParams: {
            method: "POST",
            body,
        }
    }).catch(error => {
        console.log('Failed to fetch OSM data from Overpass API.')
    }).finally(() => {
        fetchOverpassIsActive = false
        setTimeout(() => mapForFetchOverpass.delete(mapKey), 1000)
    })

    mapForFetchOverpass.set(mapKey, fetchPromise)
    return fetchPromise
}

const overpassToGeoJSON = async (data, {
    controller,
    properties = {},
} = {}) => {
    const geojson = turf.featureCollection([])
    for (const key in properties) geojson[key] = properties[key]

    for (const element of data) {
        if (controller?.signal?.aborted) return

        const id = element.id
        const type = element.type
        const tags = element.tags || {}
    
        const feature = turf.feature(
            geom=null,
            properties={...tags,
                osm_id: id,
                osm_type: type,
            }
        )
    
        if (type === 'relation') {
            const points = []
            const polygons = []
            const linestrings = []
    
            element.members.forEach(member => {
                const memberType = member.type
    
                if (memberType === 'node') {
                    points.push(member)
                } else if (member.geometry) {
                    const firstCoords = member.geometry[0]
                    const lastCoords = member.geometry[member.geometry.length-1]
    
                    if (firstCoords.lat === lastCoords.lat && firstCoords.lon === lastCoords.lon) {
                        polygons.push(member)
                    } else {
                        linestrings.push(member)
                    }
                }
            })
    
            if (points.length) {
                const featureMpt = turf.clone(feature)
                featureMpt.geometry = {
                    type: 'MultiPoint',
                    coordinates: points.map(point => [parseFloat(point.lon), parseFloat(point.lat)])
                }
                geojson.features.push(featureMpt)
            }
    
            if (linestrings.length) {
                const featureMls = turf.clone(feature)
                featureMls.geometry = {
                    type: 'MultiLineString',
                    coordinates: linestrings.map(line => line.geometry.map(coords => [parseFloat(coords.lon), parseFloat(coords.lat)]))
                }
                geojson.features.push(featureMls)
    
            }
    
            if (polygons.length) {
                const outerGeoms = []
                const innerGeoms = []
    
                polygons.forEach(polygon => {
                    const polygonGeom = polygon.geometry.map(coords => [parseFloat(coords.lon), parseFloat(coords.lat)])
                    if (polygon.role === 'inner') {
                        innerGeoms.push(polygonGeom)
                    } else {
                        outerGeoms.push(polygonGeom)
                    }
                })
    
                const featureMp = turf.clone(feature)
                featureMp.geometry = {
                    type: 'MultiPolygon',
                    coordinates: [outerGeoms, innerGeoms].filter(i => i.length)
                }
                geojson.features.push(featureMp)
            }
    
        } else {
            if (type === 'node') {
                feature.geometry = {
                    type: 'Point',
                    coordinates: [parseFloat(element.lon), parseFloat(element.lat)]
                }
            }
    
            if (type === 'way') {
                const firstCoords = element.geometry[0]
                const lastCoords = element.geometry[element.geometry.length-1]
                
                const featureType = firstCoords.lat === lastCoords.lat && firstCoords.lon === lastCoords.lon ? 'Polygon' : 'LineString'
                const coordinates = element.geometry.map(coords => [parseFloat(coords.lon), parseFloat(coords.lat)])
                
                feature.geometry = {
                    type: featureType,
                    coordinates: featureType === 'Polygon' ? [coordinates] : coordinates
                }
            }
    
            geojson.features.push(feature)
        }
    }

    return geojson
}

const fetchOSMData = async (params, {abortBtns, controller} = {}) => {
        return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const data = await response.text()
            return osmDataToGeoJSON(data)
        }
    }).catch(error => {
        console.log(error)
    })
}