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
        callback: async (response) => {
            const content = await response.blob()
            const filename = url.split('/')[url.split('/').length-1]
            console.log(filename)
            const file = new File([content], relativePath, {
                lastModified: entry.date.getTime(),
            })
        },
    }).catch(error => {
        console.log(error)
    })
}