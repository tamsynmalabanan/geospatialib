const fetchNominatim = async (latlng, zoom, {
    abortBtns,
    controller,
} = {}) => {
    const url = pushURLParams('https://nominatim.openstreetmap.org/reverse?', {
        lat: latlng.lat,
        lon: latlng.lng,
        zoom: zoom,
        format: 'geojson',
        polygon_geojson: 1,
        polygon_threshold: 0,
    })

    return fetchTimeout(url, {
        abortBtns,
        controller,
    }).then(response => {
        if (!response.ok && (response.status < 200 || response.status > 300)) {
            throw new Error('Response not ok.')
        }

        try {
            return parseJSONResponse(response)
        } catch {
            throw new Error('Failed to parse JSON.')
        }
    }).then(data => {
        if (data) data.source = url
        return data
    }).catch(error => {
        console.log(error)
    })
}

const fetchOverpassAroundPt = async (latlng, buffer, {
    abortBtns,
    controller,
} = {}) => {
    const url = 'https://overpass-api.de/api/interpreter'
    const params = `around:${buffer},${latlng.lat},${latlng.lng}`
    
    return fetchTimeout(url, {
        abortBtns,
        controller,
        fetchParams: {
            method: "POST",
            body: "data="+ encodeURIComponent(`
                [out:json][timeout:180];
                (
                    node(${params});
                    way(${params});
                    relation(${params});
                );
                out tags geom body;
            `)
        }
    }).then(response => {
        if (!response.ok && (response.status < 200 || response.status > 300)) {
            throw new Error('Response not ok.')
        }
        
        try {
            return parseJSONResponse(response)
        } catch {
            throw new Error('Failed to parse JSON.')
        }    
    }).then(data => {
        if (data) return overpassToGeoJSON(
            data.elements.filter(element => element.tags), {
            properties: {
                source: url
            }
        })
    }).catch(error => {
        console.log(error)
    })
}

const overpassToGeoJSON = (data, {
    properties = {},
} = {}) => {
    const geojson = turf.featureCollection([])
    for (const key in properties) geojson[key] = properties[key]

    data.forEach(element => {
        const id = element.id
        const type = element.type
        const tags = element.tags || {}

        const feature = turf.feature(
            geom=null,
            properties={...tags, ...{
                osm_id: id,
                osm_type: type,
            }
        })
        console.log(feature)

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
                const featureMpt = Object.assign({}, feature)
                featureMpt.geometry = {
                    type: 'MultiPoint',
                    coordinates: points.map(point => [parseFloat(point.lon), parseFloat(point.lat)])
                }
                geojson.features.push(featureMpt)
            }

            if (linestrings.length) {
                const featureMls = Object.assign({}, feature)
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

                const featureMp = Object.assign({}, feature)
                featureMp.geometry = {
                    type: 'MultiPolygon',
                    coordinates: [outerGeoms, innerGeoms]
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
    })

    return geojson
}