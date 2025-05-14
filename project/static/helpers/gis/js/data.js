const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchFileData = async (url, name, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const content = await response.blob()
            const filesArray = await getValidFilesArray([
                new File([content],
                url.split('/')[url.split('/').length-1])
            ])
            const file = filesArray.find(file => file.name === name)
            if (!file) throw new Error('Filename not found.')

            const data = await getFileData(file)
            console.log(data)
            return data
        },
    }).catch(error => {
        console.log(error)
    })
}