const fetchSearchNominatim = async (q, {
    format='geojson',
    limit=100,
    abortBtns,
    controller,
} = {}) => {
    if (!q) return

    const url = pushURLParams('https://nominatim.openstreetmap.org/search?', {
        q, format, limit
    })
    
    const id = `nominatim-search;${JSON.stringify({params:{url}})}`
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