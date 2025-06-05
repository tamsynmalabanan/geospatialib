const fetchWMSData = async (params, {queryGeom, abortBtns, controller, event} = {}) => {
    console.log(params)
    
    const map = event.target
    const cleanURL = removeQueryParams(params.url)

    const getParams = {
        SERVICE: 'WMS',
        // VERSION: '1.3.0',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        FORMAT: 'application/json',
        INFO_FORMAT: 'application/json',
        TRANSPARENT: true,
        QUERY_LAYERS: params.name,
        LAYERS: params.name,
        exceptions: 'application/vnd.ogc.se_inimage',
        SRS: "EPSG:4326",
        CRS: 'EPSG:4326',
        // BBOX: turf.bbox(queryGeom),
        BBOX: map.getBounds().toBBoxString(),
        WIDTH: Math.floor(map.getSize().x),
        HEIGHT: Math.floor(map.getSize().y),
        X: Math.floor(event.containerPoint.x),
        Y: Math.floor(event.containerPoint.y),
    }

    const styles = JSON.parse(params.styles ?? '{}')
    if (Object.keys(styles).length) {
        getParams.STYLES = Object.keys(styles)[0]
    }
    
    const url = pushQueryParamsToURLString(cleanURL, getParams)
    console.log(url)

    // return fetchDataWithTimeout(url, {
    //     abortBtn:options.abortBtn,
    //     controller:options.controller,
    // }).then(response => {
    //     if (response.ok || response.status === 200) {
    //         return response
    //     } else {
    //         throw new Error('Response not ok')
    //     }
    // })
    // .then(response => {
    //     const contentType = response.headers.get('Content-Type')
    //     if (contentType.includes('json')) {
    //         try {
    //             return parseChunkedResponseToJSON(response)
    //         } catch {
    //             throw new Error('Failed to parse JSON.')
    //         }
    //     } else if (contentType.includes('xml')) {
    //         return response.text()
    //         .then(xmlString => {
    //             const features = []

    //             const [namespace, rootElement] = parseXML(xmlString)
    //             if (namespace) {
    //                 if (namespace === 'http://www.esri.com/wms') {
    //                     rootElement.childNodes.forEach(child => {
    //                         const tagName = child.tagName
    //                         if (tagName && tagName.toLowerCase() === 'fields') {
    //                             const attributes = Object.values(child.attributes)
    //                             if (attributes.length > 0) {
    //                                 const feature = {type: "Feature", properties:{}}
    //                                 attributes.forEach(attr => {
    //                                     feature.properties[attr.name] = attr.value
    //                                 })
    //                                 features.push(feature)
    //                             }
    //                         }
    //                     })
    //                 }
    //             }

    //             if (features.length > 0) {
    //                 return turf.featureCollection(features)
    //             } else {
    //                 throw new Error('No features returned.')
    //             }
    //         })
    //     }
    // })
    // .then(data => {
    //     if (data && data.features && data.features.length > 0) {
    //         if (!data.licence) {
    //             data.licence = `Data © <a href='${cleanURL}' target='_blank'>${getDomain(cleanURL)}</a>`
    //         }
    //         return data
    //     } else {
    //         throw new Error('No features returned.')
    //     }
    // })        
    // .catch(error => {
    //     return
    // })
}

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