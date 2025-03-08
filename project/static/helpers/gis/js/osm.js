const fetchNominatim = async (latlng, zoom, {

} = {}) => {
    const url = 'https://nominatim.openstreetmap.org/reverse?'
    return fetchDataWithTimeout(pushQueryParamsToURLString(url, {
        lat: event.latlng.lat,
        lon: event.latlng.lng,
        zoom: getZoom(),
        format: 'geojson',
        polygon_geojson: 1,
        polygon_threshold: 0,
    }), {
        abortBtn:options.abortBtn,
        controller:options.controller,
    }).then(response => {
        if (response.ok || response.status === 200) {
            try {
                return parseChunkedResponseToJSON(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        } else {
            throw new Error('Response not ok')
        }
    }).then(data => {
        if (data && data.features && data.features.length > 0) {
            const features = data.features
            features.forEach(feature => {
                feature.properties.osm_api = url
            })
            return data
        } else {
            throw new Error('No features returned.')
        }
    }).catch(error => {
        return
    });
}
