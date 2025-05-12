const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => await parseJSONResponse(response)
    }).catch(error => {
        console.log(error)
    })
}