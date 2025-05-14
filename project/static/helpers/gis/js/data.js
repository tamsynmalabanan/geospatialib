const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchFileData = async (url, filename, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const content = await response.blob()
            const filesArray = await getValidFilesArray([
                new File([content],
                url.split('/')[url.split('/').length-1])
            ])
            const file = filesArray.find(file => file.name === filename)
            if (!file) throw new Error('Filename not found.')

            return await getFileData(file)
        },
    }).catch(error => {
        console.log(error)
    })
}