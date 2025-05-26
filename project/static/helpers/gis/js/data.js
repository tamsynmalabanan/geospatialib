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

const fetchCSV = async (url, xField, yField, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const csv = await response.text()
            return csvToGeoJSON(csv, xField, yField)
        }
    }).catch(error => {
        console.log(error)
    })
}

const rawDataToLayerData = (rawData, type, {
    xField,
    yField,
    srid=4326
} = {}) => {
    try {
        if (Array('geojson', 'csv').includes(type)) {
            let geojson

            if (type === 'geojson') {
                geojson = JSON.parse(rawData)
            }
        
            if (type === 'csv') {
                geojson = csvToGeoJSON(rawData, xField, yField)
            }

            if (geojson) {
                console.log(geojson.crs, !isNaN(parseInt(srid)), parseInt(srid) !== 4326, parseInt(srid))
                if (!geojson.crs && !isNaN(parseInt(srid)) && parseInt(srid) !== 4326) {
                    geojson.crs = {properties:{name:`EPSG::${srid}`}}
                }
                
                return geojson
            }
        }
    } catch (error) {
        console.log(error)
    }
}

const mapForFetchFileData = new Map()
const fetchFileData = async (url, name, type, xField, yField, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = filesArray.find(file => file.name === name)
        if (!file) return
        
        const rawData = await getFileRawData(file)
        return rawDataToLayerData(rawData, type, {
            xField,
            yField
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