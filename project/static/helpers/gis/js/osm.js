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

const fetchOverpassAroundPt = async (latlng, zoom, {
    abortBtns,
    controller,
} = {}) => {
    return fetchTimeout('https://overpass-api.de/api/interpreter', {
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
    })

    const fetchData = async (buffer=10, minimum=1, options={}) => {
        const params = `around:${buffer},${latlng.lat},${latlng.lng}`
        return fetchDataWithTimeout("https://overpass-api.de/api/interpreter", {
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
            if (data && data.elements) {
                const newElements = data.elements.filter(element => Object.keys(element).includes('tags'))
                if ((newElements.length >= minimum) || buffer > 100000) {
                    data.elements = newElements
                    return data
                } else {
                    return fetchData(buffer=buffer*2, minimum=minimum*1.25, options={abortBtn:options.abortBtn})                    
                }
            } else {
                throw new Error('No elements returned.')
            }
        }).catch(error => {
            return
        })
    }

    const data = await fetchData(buffer=10, minimum=1, options={abortBtn:options.abortBtn})
    return turf.featureCollection(
        overpassOSMDataToGeoJSON(data, {maximum:options.maximum})
    )
}