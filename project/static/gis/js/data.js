const fetchSearchNominatim = async (params, {
    controller,
    abortControls,
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
        controller,
        abortControls,
        callback: async (response) => {
            const data = await parseJSONResponse(id, response)
            if (data?.features?.length) {
                await updateGISDB(id, {data})
            }
            return data
        }
    }).catch(error => {
        console.log(error)
    })
}