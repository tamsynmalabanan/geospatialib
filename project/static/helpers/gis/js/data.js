const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchCSV = async (url, xField, yField, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const csv = await response.text()
            console.log(csv)
            return csvToGeoJSON(csv, xField, yField)
        }
    }).catch(error => {
        console.log(error)
    })
}

const mapForFetchFileData = new Map()
const fetchFileData = async (url, name, type, xField, yField, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = filesArray.find(file => file.name === name)
        if (!file) return
        
        const data = await getFileData(file, {type, xField, yField})
        if (!data) return
        
        const typeLower = type.toLowerCase()

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