const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
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

const fetchCSV = async (url, xField, yField, crs, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const csv = await response.text()
            return csvToGeoJSON(csv, xField, yField, crs)
        }
    }).catch(error => {
        console.log(error)
    })
}

const rawDataToLayerData = (rawData, type, {
    xField,
    yField,
    crs=4326
} = {}) => {
    try {
        if (type === 'geojson') {
            return JSON.parse(rawData)
        }
    
        if (type === 'csv') {
            return csvToGeoJSON(rawData, xField, yField, crs)
        }
    } catch (error) {
        console.log(error)
    }
}

const mapForFetchFileData = new Map()
const fetchFileData = async (url, name, type, xField, yField, crs, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = filesArray.find(file => file.name === name)
        if (!file) return
        
        const rawData = await getFileRawData(file)
        return rawDataToLayerData(rawData, type, {
            xField,
            yField,
            crs,
        })
    }

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
        console.log(error.message, url, name)
    }).finally(() => {
        setTimeout(() => mapForFetchFileData.delete(mapKey), 1000)
    })

    mapForFetchFileData.set(mapKey, filesArrayPromise)
    return handler(await filesArrayPromise)
}