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

    console.log(url)

    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}