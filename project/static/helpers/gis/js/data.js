const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            try {
                return await parseJSONResponse(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        }
    }).catch(error => {
        console.log(error)
    })
}