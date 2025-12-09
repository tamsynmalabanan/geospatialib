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

const isBinaryDXF = (arrayBuffer) => {
    const header = new TextDecoder('utf-8').decode(arrayBuffer.slice(0, 22))
    return header.includes('AutoCAD Binary DXF')
}

const dxfGeomHandlers = {
    'LINE': (entity) => {
        if (!entity.start || !entity.end) return
        return {
            type: 'LineString',
            coordinates: [
                [entity.start.x, entity.start.y, entity.start.z ?? 0],
                [entity.end.x, entity.end.y, entity.end.z ?? 0]
            ]
        }
    },
    'CIRCLE': (entity) => {
        if (!entity.center) return
        return {
            type: 'Point',
            coordinates: [entity.center.x, entity.center.y, entity.center.z ?? 0]
        }
    },
    'POINT': (entity) => {
        if (!entity.position) return
        return {
            type: 'Point',
            coordinates: [entity.position.x, entity.position.y, , entity.position.z ?? 0]
        }
    },
    'LWPOLYLINE': (entity) => {
        if (!entity.vertices) return
        const isClosed = (
            entity.vertices.length > 2 
            && entity.vertices[0].x === entity.vertices.at(-1).x 
            && entity.vertices[0].y === entity.vertices.at(-1).y
        )
        const vertices = entity.vertices.map(v => [v.x, v.y, v.z ?? 0])
        return {
            type: isClosed ? 'Polygon' : 'LineString',
            coordinates: isClosed ? [vertices] : vertices
        }
    },
    'ARC': null,
    'INSERT': null,
    'ELLIPSE': null,
    'POLYLINE': null,
    'SPLINE': null,
    'TEXT': null,
    'MTEXT': null,
    'HATCH': null,
    'SOLID': null,
    '3DFACE': null,
    'IMAGE': null,
    'WIPEOUT': null,
    'SHAPE': null,
    'RAY': null,
    'XLINE': null,
}

const dxfToGeoJSON = (dxf, params) => {
    const entities = dxf.entities
    if (!entities) return

    const features = entities.map(entity => {
        let handler = dxfGeomHandlers[entity.type]
        if (!handler) {
            if (entity.vertices) {
                handler = dxfGeomHandlers.LWPOLYLINE
            } else if (entity.start && entity.end) {
                handler = dxfGeomHandlers.LINE
            } else if (entity.position) {
                handler = dxfGeomHandlers.POINT
            } else if (entity.center) {
                handler = dxfGeomHandlers.CIRCLE
            }
        }
        const geometry = handler(entity)

        if (!geometry || !turf.booleanValid(geometry)) {
            console.log('Invalid geometry', geometry, entity)
            return
        }

        return {
            type: 'Feature',
            geometry,
            properties: {...entity, vertices: null}
        }
    }).filter(feature => feature)

    const geojson = turf.featureCollection(features)

    const srid = params.srid
    if (srid && srid !== 4326) {
        geojson.crs = {properties:{name:`EPSG::${srid}`}}
    }

    return geojson
}

const fetchDXF = async (params, {abortBtns, controller} = {}) => {
    return await fetchTimeout(params.url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const buffer = await response.arrayBuffer()
            console.log(buffer)
            if (isBinaryDXF(buffer)) return

            const text = new TextDecoder('utf-8').decode(buffer)
            const parser = new DxfParser()
            const dxfParsed = parser.parseSync(text)
            const geojson = dxfToGeoJSON(dxfParsed, params)
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

        if (params.type === 'dxf') {
            const parser = new DxfParser()
            const dxfParsed = parser.parseSync(rawData)
            const geojson = dxfToGeoJSON(dxfParsed, params)
            return geojson
        }

        if (Array('gpkg', 'sqlite').includes(params.type)) {
            const file = filesArray.find(file => file.name === params.name)
            const arrayBuffer = await file.arrayBuffer()

            const db = new SQL.Database(new Uint8Array(arrayBuffer))
            const result = db.exec(`SELECT * FROM ${params.title ?? params.name.split('/').pop()}`)
            if (!result.length) return

            const { columns, values } = result[0]
            const geomField = columns.find(i => Array("geom", "GEOMETRY").includes(i))
            if (!geomField) return

            const features = values.map(row => {
                const properties = {}
                let geometry = null

                columns.forEach((col, i) => {
                    if (col === geomField) {
                        const geomBuffer = Buffer.from(row[i])
                        
                        if (params.type === 'sqlite') {
                            try {
                                const parsedGeom = wkx.Geometry.parse(geomBuffer)
                                geometry = parsedGeom.toGeoJSON()
                            } catch (e) {
                                try {
                                    const parsedGeom = wkx.Geometry.parse(geomBuffer.slice(38))
                                    geometry = parsedGeom.toGeoJSON()
                                } catch (e) {
                                    geometry = null
                                }
                            }
                        }
                        
                        if (params.type === 'gpkg') {
                            try {
                                const parsedGeom = wkx.Geometry.parse(geomBuffer.slice(40))
                                geometry = parsedGeom.toGeoJSON()
                            } catch (e) {
                                geometry = null
                            }
                        }
                    } else {
                        properties[col] = row[i]
                    }
                })

                return {
                    type: 'Feature',
                    geometry,
                    properties,
                }
            })

            const geojson = {
                type: 'FeatureCollection',
                features
            }

            return geojson
        }

        const osmInType = Array(params.format, params.type).some(i => i === 'osm')
        const osmInData = Array('openstreetmap', 'osm').some(i => rawData.toLowerCase().includes(i))
        if (osmInType || osmInData) return osmDataToGeoJSON(rawData)
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
                const headers = await (() => {
                    return fetchHeadersViaCORSProxy(url)
                    .then(response => response.json())
                    .catch(error => console.log(error))
                })() ?? {}
                const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(headers['Content-Disposition'] ?? headers['content-disposition'] ?? '');
                const filename = match ? match[1].replace(/['"]/g, '') : decodeURIComponent(url.split('/').pop())
                const file = new File([content], filename, {type: content.type})
                const filesArray = await getValidLayersArray([file])
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