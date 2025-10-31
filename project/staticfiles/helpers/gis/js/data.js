const fetchWMSData = async (params, {queryGeom, abortBtns, controller, event} = {}) => {
    const map = event.target
    const cleanURL = removeQueryParams(params.url)

    const getParams = {
        SERVICE: 'WMS',
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
    
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const contentType = response.headers.get('Content-Type')
            if (contentType.includes('json')) {
                try {
                    return parseJSONResponse(response)
                } catch {
                    throw new Error('Failed to parse JSON.')
                }
            } else if (contentType.includes('xml')) {
                return response.text()
                .then(xmlString => {
                    const features = []

                    const [namespace, rootElement] = parseXML(xmlString)
                    if (namespace === 'http://www.esri.com/wms') {
                        rootElement.childNodes.forEach(child => {
                            const tagName = child.tagName
                            if (!tagName || tagName.toLowerCase() !== 'fields') return
                            
                            const attributes = Object.values(child.attributes)
                            if (attributes.length == 0) return
                            
                            const feature = {type: "Feature", properties:{}}
                            attributes.forEach(attr => feature.properties[attr.name] = attr.value)
                            features.push(feature)
                        })
                    }
                    
                    return geojson = turf.featureCollection(features)
                })
            }
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchWFSData = async (params, {queryGeom, zoom, abortBtns, controller, event} = {}) => {
    const queryExtent = queryGeom ? turf.getType(queryGeom) === 'Point' ? turf.buffer(
        queryGeom, leafletZoomToMeter(zoom)/2/1000
    ).geometry : queryGeom : turf.bboxPolygon([-180, -90, 180, 90]).geometry
    const [w,s,e,n] = turf.bbox(queryExtent)

    const cleanURL = removeQueryParams(params.url)
    const srsname = `urn:ogc:def:crs:EPSG::${params.srid ?? 4326}`
    const getParams = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: params.name,
        outputFormat: 'json',
        srsname,
        bbox: [s,w,n,e,srsname]
    }

    const url = pushQueryParamsToURLString(cleanURL, getParams)
        return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const contentType = response.headers.get('Content-Type')
            if (contentType.includes('json')) {
                try {
                    return parseJSONResponse(response)
                } catch {
                    throw new Error('Failed to parse JSON.')
                }
            } else if (contentType.includes('xml')) {
                return response.text()
                .then(xmlString => {
                    const features = []

                    const [namespace, rootElement] = parseXML(xmlString)
                    if (namespace === 'http://www.esri.com/wms') {
                        rootElement.childNodes.forEach(child => {
                            const tagName = child.tagName
                            if (!tagName || tagName.toLowerCase() !== 'fields') return
                            
                            const attributes = Object.values(child.attributes)
                            if (attributes.length == 0) return
                            
                            const feature = {type: "Feature", properties:{}}
                            attributes.forEach(attr => feature.properties[attr.name] = attr.value)
                            features.push(feature)
                        })
                    }
                    
                    return geojson = turf.featureCollection(features)
                })
            }
        }
    }).catch(error => {
        console.log(error)
    })
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

const fetchGPX = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const gpx = await response.text()
            const dom = (new DOMParser()).parseFromString(gpx, 'text/xml')
            const geojson = toGeoJSON.gpx(dom)
            return geojson
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchKML = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const kml = await response.text()
            const dom = (new DOMParser()).parseFromString(kml, 'text/xml')
            const geojson = toGeoJSON.kml(dom, { styles: true })
            return geojson
        }
    }).catch(error => {
        console.log(error)
    })
}

const fetchSHP = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const buffer = await response.arrayBuffer()
            const geojson = await shp({shp:buffer})
            return geojson
        }
    }).catch(error => {
        console.log(error)
    })
}

const rawDataToLayerData = async (rawData, params, {
    filesArray=[]
}) => {
    try {
        if (params.type === 'geojson') {
            return JSON.parse(rawData)
        }
    
        if (params.type === 'csv') {
            return csvToGeoJSON(rawData, params)
        }
    
        if (params.type === 'gpx') {
            const dom = (new DOMParser()).parseFromString(rawData, 'text/xml')
            return toGeoJSON.gpx(dom)
        }
    
        if (params.type === 'kml') {
            const dom = (new DOMParser()).parseFromString(rawData, 'text/xml')
            return toGeoJSON.kml(dom, { styles: true })
        }

        if (params.type === 'shp') {
            const name = params.name.split('.shp')[0]
            const shpFiles = {}
            for (const ext of ['shp', 'dbf', 'prj', 'cpg']) {
                const file = filesArray.find(file => file.name === `${name}.${ext}`)
                if (!file) continue
    
                const buffer = await file.arrayBuffer()
                shpFiles[ext] = buffer
            }
            
            const geojson = await shp(shpFiles)
            return geojson
        }

        const normalRawData = rawData.toLowerCase()
        if (
            Array(params.format, params.type).some(i => i === 'osm') 
            || Array('openstreetmap', 'osm').some(i => normalRawData.includes(i))
        ) {
            return osmDataToGeoJSON(rawData)
        }
    } catch (error) {
        console.log(error)
    }
}

const mapForFetchFileData = new Map()
const fetchFileData = async (params, {abortBtns, controller} = {}) => {
    const handler = async (filesArray) => {
        const file = (
            filesArray.length === 1 
            ? filesArray[0] 
            : filesArray.find(file => file.name === params.name)
        )
        if(!file) return
        
        const rawData = await getFileRawData(file)
        const data = await rawDataToLayerData(rawData, params, {filesArray})

        return data
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
                const file = new File([content], decodeURIComponent(url.split('/').splice(-1)), {type: content.type})
                const filesArray = await getValidFilesArray([file])
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