const fetchNominatim = async (latlng, zoom, {
    abortBtn,
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
        abortBtn,
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
    });
}
