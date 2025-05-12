const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchFiles = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: (response) => {
            const content = response.blob()
            console.log(content)
        },
    }).catch(error => {
        console.log(error)
    })
}