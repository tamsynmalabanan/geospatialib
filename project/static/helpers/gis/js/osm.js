const fetchNominatim = async ({
    queryGeom,
    zoom,
    abortBtns,
    controller,
} = {}) => {
    const [lon, lat] = turf.centroid(queryGeom).geometry.coordinates
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

    tags = tags.startsWith('[') ? tags : `[${tags}`
    tags = tags.endsWith(']') ? tags : `${tags}]`
    tags = tags.split(/([\[\]=~])/).filter(Boolean)
    tags = tags.map(i => {
        i = i.trim()
        if (['[', ']', '=', '~'].includes(i)) return i

        i = i.startsWith('"') ? i : `"${i}`
        i = i.endsWith('"') ? i : `${i}"`
        return i
    })
    tags = tags.join('')

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

const fetchOverpass = async (params, {
    queryGeom,
    zoom,
    abortBtns,
    controller,
    query = getOverpassQueryBlock(queryGeom, {zoom, ...params}),
} = {}) => {
    const url = 'https://overpass-api.de/api/interpreter'    
    const body = "data="+encodeURIComponent(`[out:json][timeout:180];${query}out tags geom body;`)
    return fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const data = await parseJSONResponse(response)
            if (!data) return

            const elements = data.elements?.filter(element => element.tags)
            delete data.elements
            return await overpassToGeoJSON(elements, {controller, properties:data})
        },
        fetchParams: {
            method: "POST",
            body,
        }
    }).catch(error => {
        console.log(error)
    })
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