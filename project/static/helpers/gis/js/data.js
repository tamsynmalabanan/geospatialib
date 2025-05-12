const fetchGeoJSON = (url, {abortBtns, controller} = {}) => {
    return fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            try {
                return await parseJSONResponse(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        }
    })
}