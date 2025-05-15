const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const mapForFetchFileData = new Map()
const fetchFileData = async (url, name, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = filesArray.find(file => file.name === name)
        if (!file) throw new Error('Filename not found.')
            
        const data = await getFileData(file)
        return data
    }

    const mapKey = `${url};${controller?.id}` 
    if (mapForFetchFileData.has(mapKey)) {
        console.log('here')
        return handler(await mapForFetchFileData.get(mapKey))
    }

    const filesArrayPromise = fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const content = await response.blob()
            const filesArray = await getValidFilesArray([
                new File([content],
                url.split('/')[url.split('/').length-1])
            ])
            return filesArray
        },
    }).catch(error => {
        console.log(error.message, url, name)
    }).finally(() => {
        setTimeout(() => mapForFetchFileData.delete(mapKey), 1000)
    })

    mapForFetchFileData.set(mapKey, filesArrayPromise)
    return handler(await filesArrayPromise)
}