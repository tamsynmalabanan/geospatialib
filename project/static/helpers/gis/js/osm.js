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
        if (data) data.source = url
        return data
        // return turf.featureCollection(
        //     overpassOSMDataToGeoJSON(data, {maximum:options.maximum})
        // )
    }).catch(error => {
        console.log(error)
    })
}