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
            console.log(name, filesArray, file)
            if (!file) throw new Error('Filename not found.')
                
            const data = await getFileData(file)
            return data
        },
    }).catch(error => {
        console.log(error, name)
    })
}