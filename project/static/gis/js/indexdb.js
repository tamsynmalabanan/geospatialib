const requestGISDB = () => {
    const request = indexedDB.open('GISDB', 1)

    request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('gis')) {
            db.createObjectStore('gis', { keyPath: 'id' })
        }
    }
    
    return request
}

const getAllGISDBKeys = async () => {
    return new Promise(async (resolve, reject) => {
        const request = requestGISDB()
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['gis'], 'readonly')
            const objectStore = transaction.objectStore('gis')
            
            const keysRequest = objectStore.getAllKeys()
            keysRequest.onsuccess = () => resolve(keysRequest.result)
            keysRequest.onerror = () => resolve([])
        }
        request.onerror = (e) => resolve([])
    })
}

const saveToGISDB = async (data, {
    id = `local-${generateRandomString(64)}`,
    params = {},
    extent,
    normalize=true,
}={}) => {
    if (data?.type === 'FeatureCollection') {
        if (normalize) {
            await normalizeGeoJSON(data)
        }

        if (!extent) {
            extent = turf.envelope(data).geometry
        }
    }

    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        objectStore.put({id, data:structuredClone(data), extent, params})
    }

    return id
}

const getFromGISDB = async (id) => {
    return new Promise((resolve, reject) => {
        const request = requestGISDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['gis'], 'readonly')
            const objectStore = transaction.objectStore('gis')
            const dataRequest = objectStore.get(id)
    
            dataRequest.onsuccess = async (e) => {
                const result = e.target.result
                if (!result) return resolve(null)
                
                const {data, extent, params} = result
                resolve({data:structuredClone(data), extent, params})
            }
    
            dataRequest.onerror = (e) => {
                reject(e.target.errorCode)
            }
        }
  
        request.onerror = (e) => {
            reject(e.target.errorCode)
        }
    })
}

const deleteFromGISDB = (id) => {
    const request = requestGISDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        const deleteRequest = objectStore.delete(id)
    
        deleteRequest.onsuccess = () => {
        }
    
        deleteRequest.onerror = (e) => {
        }
    }
  
    request.onerror = (e) => {
    }
}

const clearGISDB = () => {
    const request = requestGISDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        
        const clearRequest = objectStore.clear();

        clearRequest.onsuccess = function () {
        }

        clearRequest.onerror = function (event) {
        }
    }
  
    request.onerror = (e) => {
    }
}

const getGISDBData = async ({keys=[]}={}) => {
    return new Promise((resolve, reject) => {
        const request = requestGISDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['gis'], 'readonly')
            const objectStore = transaction.objectStore('gis')
            const dataRequest = objectStore.getAll()
    
            dataRequest.onsuccess = async (e) => {
                const result = (
                    keys.length 
                    ? dataRequest.result.filter(i => keys.includes(i.id)) 
                    : dataRequest.result
                )
                resolve(result)
            }
    
            dataRequest.onerror = (e) => {
                reject(e.target.errorCode)
            }
        }
  
        request.onerror = (e) => {
            reject(e.target.errorCode)
        }
    })
}

const updateGISDB = async (id, {
    data,
    extent,
    params,
}) => {
    return new Promise(async (resolve, reject) => {
        if (data?.type === 'FeatureCollection') {
            await normalizeGeoJSON(data)

            if (!extent) {
                extent = turf.envelope(data).geometry
            }
        }
        
        const storedContent = await getFromGISDB(id)
        
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
                        await saveToGISDB(content.data, {
                            id, 
                            extent: content.extent, 
                            params,
                            normalize: false,
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
        
        await saveToGISDB(data, {
            id, 
            extent, 
            params,
            normalize: false,
        })

        resolve(id)
    })
}
