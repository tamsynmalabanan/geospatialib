const fetchGeoJSON = (url, {abortBtns, controller} = {}) => {
    return fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            try {
                console.log('here')
                return await parseJSONResponse(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        }
    })
}