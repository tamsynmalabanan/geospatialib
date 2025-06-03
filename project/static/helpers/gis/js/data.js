const fetchGeoJSON = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            try {
                return parseJSONResponse(response)
            } catch (error) {
                console.log(error)
            }
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchCSV = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const csv = await response.text()
            return csvToGeoJSON(csv, params)
        }
    }).catch(error => {
        console.log(error)
    })
}

const rawDataToLayerData = (rawData, params) => {
    try {
        if (params.type === 'geojson') {
            return JSON.parse(rawData)
        }
    
        if (params.type === 'csv') {
            return csvToGeoJSON(rawData, params)
        }
    } catch (error) {
        console.log(error)
    }
}

const mapForFetchFileData = new Map()
const fetchFileData = async (params, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = filesArray.find(file => file.name === params.name)
        if (!file) return
        
        const rawData = await getFileRawData(file)
        return rawDataToLayerData(rawData, params)
    }

    const url = params.url
    const mapKey = `${url};${controller?.id}` 
    if (mapForFetchFileData.has(mapKey)) {
        return handler(await mapForFetchFileData.get(mapKey))
    }

    const filesArrayPromise = fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            try {
                const content = await response.blob()
                const filesArray = await getValidFilesArray([
                    new File([content],
                    decodeURIComponent(url.split('/')[url.split('/').length-1]))
                ])
                return filesArray
            } catch (error) {
                console.log(error)
            }
        },
    }).catch(error => {
        console.log(error.message, params)
    }).finally(() => {
        setTimeout(() => mapForFetchFileData.delete(mapKey), 1000)
    })

    mapForFetchFileData.set(mapKey, filesArrayPromise)
    return handler(await filesArrayPromise)
}