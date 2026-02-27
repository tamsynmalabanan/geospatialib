const requestGISDB = () => {
    const request = indexedDB.open('GISDB', 1)

    request.onupgradeneeded = (e) => {
        const db = e.target.result
        
        if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains('config')) {
            db.createObjectStore('config', { keyPath: 'id' })
        }
    }
    
    return request
}

const getGISDBDataKeys = async () => {
    return new Promise(async (resolve, reject) => {
        const request = requestGISDB()
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['data'], 'readonly')
            const objectStore = transaction.objectStore('data')
            
            const keysRequest = objectStore.getAllKeys()
            keysRequest.onsuccess = () => resolve(keysRequest.result)
            keysRequest.onerror = () => resolve([])
        }
        request.onerror = (e) => resolve([])
    })
}

const saveGISDBData = async (data, {
    id = `local-${generateRandomString(64)}`,
    params = {},
    extent,
}={}) => {
    if (!extent && data?.type === 'FeatureCollection') {
        extent = turf.envelope(data).geometry
    }

    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['data'], 'readwrite')
        const objectStore = transaction.objectStore('data')
        objectStore.put({id, data:structuredClone(data), extent, params})
    }

    return id
}

const getGISDBData = async (id, {filter}={}) => {
    return new Promise((resolve, reject) => {
        const request = requestGISDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['data'], 'readonly')
            const objectStore = transaction.objectStore('data')
            const dataRequest = objectStore.get(id)
    
            dataRequest.onsuccess = async (e) => {
                const result = e.target.result
                if (!result) return resolve(null)
                
                const {data, extent, params} = result
                const clonedData = structuredClone(data)

                if (filter) {
                    const extentParts = turf.flatten(extent).features
                    if (extentParts.find(f => turf.booleanContains(f, filter))) {
                        clonedData.features = clonedData.features.filter(f => turf.booleanIntersects(f, filter))
                    } else {
                        reject('Current extent does not contain filter.')
                    }
                }
                
                resolve({data:clonedData, extent, params})
            }
    
            dataRequest.onerror = (e) => {
                reject(e.target.errorCode)
            }
        }
  
        request.onerror = (e) => {
            reject(e.target.errorCode)
        }
    }).catch(error => console.log(error))
}

const deleteGISDBData = (id) => {
    const request = requestGISDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['data'], 'readwrite')
        const objectStore = transaction.objectStore('data')
        const deleteRequest = objectStore.delete(id)
    
        deleteRequest.onsuccess = () => {
        }
    
        deleteRequest.onerror = (e) => {
        }
    }
  
    request.onerror = (e) => {
    }
}

const clearGISDBData = () => {
    const request = requestGISDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['data'], 'readwrite')
        const objectStore = transaction.objectStore('data')
        
        const clearRequest = objectStore.clear();

        clearRequest.onsuccess = function () {
        }

        clearRequest.onerror = function (event) {
        }
    }
  
    request.onerror = (e) => {
    }
}

const updateGISDBData = async (id, {
    data,
    extent,
    params,
}) => {
    return new Promise(async (resolve, reject) => {
        if (!extent && data?.type === 'FeatureCollection') {
            extent = turf.envelope(data).geometry
        }
        
        const storedContent = await getGISDBData(id)
        
        if (storedContent) {
            params = {
                ...(storedContent.params ?? {}),
                ...(params ?? {}),
            }

            if (data && extent) {
                const storedExtent = storedContent.extent
                const storedExtentParts = turf.flatten(storedExtent).features
                if (storedExtentParts.some(f => !turf.booleanContains(extent, f))) {
                    const worker = new Worker('/static/gis/js/workers/indexdb-update.js')
                    
                    worker.postMessage({
                        data, 
                        extent,
                        storedData: storedContent.data,
                        storedExtent: storedExtent,
                    })
            
                    worker.onmessage = async (e) => {
                        const content = e.data
                        await saveGISDBData(content.data, {
                            id, 
                            extent: content.extent, 
                            params,
                        })
                        worker.terminate()
                        resolve(id)
                    }
                    
                    worker.onerror = (error) => {
                        worker.terminate()
                        reject()
                    }
                }
            }
        }
        
        await saveGISDBData(data, {
            id, 
            extent, 
            params,
        })

        resolve(id)
    })
}

const getGISDBConfig = async (id='main') => {
    return new Promise((resolve, reject) => {
        const request = requestGISDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['config'], 'readonly')
            const objectStore = transaction.objectStore('config')
            const dataRequest = objectStore.get(id)
    
            dataRequest.onsuccess = async (e) => {
                resolve(e.target.result?.config)
            }
    
            dataRequest.onerror = (e) => {
                reject(e.target.errorCode)
            }
        }
  
        request.onerror = (e) => {
            reject(e.target.errorCode)
        }
    }).catch(error => console.log(error))
}

const saveGISDBConfig = async (config, {id='main'}={}) => {
    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['config'], 'readwrite')
        const objectStore = transaction.objectStore('config')
        objectStore.put({id, config})
    }

    return id
}
