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
        console.log(file)
        if (!file) return
        
        const data = await getFileData(file)
        console.log(data)
        if (!data) return
        
        const typeLower = name.split('.')[name.split('.')-1].toLowerCase()
        console.log(typeLower)

        if (typeLower === 'geojson') {
            return data
        }
    }

    const mapKey = `${url};${controller?.id}` 
    if (mapForFetchFileData.has(mapKey)) {
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