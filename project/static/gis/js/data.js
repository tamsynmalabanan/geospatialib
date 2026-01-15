const fetchSearchNominatim = async (params, {
    abortController,
    abortEvents,
}={}) => {
    const q = params.q?.toLowerCase()
    if (!q) return

    const url = pushURLParams('https://nominatim.openstreetmap.org/search?', {
        q, format:'geojson', limit:params.limit ?? 100
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