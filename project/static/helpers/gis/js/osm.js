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

            return osmtogeojson(data)
        },
        fetchParams: {
            method: "POST",
            body,
        }
    }).catch(error => {
        console.log(error)
    })
}