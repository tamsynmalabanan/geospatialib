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

const saveToGISDB = (gisData, {
    id, 
    queryExtent, 
    expirationDays=7,
}={}) => {
    if (!gisData) return

    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')

        if (!id) {
            const currentKeys = new Promise(async (resolve, reject) => {
                const keysRequest = objectStore.getAllKeys()
                keysRequest.onsuccess = () => {
                    resolve(keysRequest.result)
                }
            })
            console.log(currentKeys)
            id = `client;${generateRandomString()}`
        }

        if (!queryExtent && gisData.type === 'FeatureCollection') {
            queryExtent = turf.bboxPolygon(turf.bbox(gisData)).geometry
        }

        const expirationTime = Date.now() + (expirationDays*1000*60*60*24)
        objectStore.put({id, gisData, queryExtent, expirationTime})
    }

    return id
}

const updateGISDB = async (id, newGISData, newQueryExtent) => {
    return new Promise(async (resolve, reject) => {
        const save = (data) => {
            const {gisData, queryExtent} = data
            if (data) saveToGISDB(gisData, {id, queryExtent})
            resolve()
        }
        
        const cachedData = await getFromGISDB(id, {save:false})
        if (!cachedData) {
            save({
                gisData:newGISData, 
                queryExtent:newQueryExtent,
            })
        } else {
            const worker = new Worker('/static/helpers/gis/js/workers/indexdb-update.js')
    
            worker.postMessage({
                newGISData, 
                newQueryExtent,
                currentGISData: cachedData.gisData,
                currentQueryExtent: cachedData.queryExtent,
            })
    
            worker.onmessage = (e) => {
                save(e.data)
                worker.terminate()
            }
            
            worker.onerror = (error) => {
                worker.terminate()
                reject()
            }
        }
    })
}

const getFromGISDB = async (id, {save=true}={}) => {
    return new Promise((resolve, reject) => {
        const request = requestGISDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['gis'], 'readonly')
            const objectStore = transaction.objectStore('gis')
            const gisDataRequest = objectStore.get(id)
    
            gisDataRequest.onsuccess = (e) => {
                const result = e.target.result
                if (!result) return resolve(null)
                
                const {gisData, queryExtent} = result
                if (save) saveToGISDB(gisData, {id, queryExtent})
                resolve({gisData:structuredClone(gisData), queryExtent})
            }
    
            gisDataRequest.onerror = (e) => {
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

setInterval(async () => {
    const request = requestGISDB()

    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        
        objectStore.openCursor().onsuccess = (e) => {
            const cursor = e.target.result
            if (!cursor) return 
            
            const currentTime = Date.now()
            if (cursor.value.expirationTime && cursor.value.expirationTime < currentTime) {
                objectStore.delete(cursor.key)
            }
            cursor.continue()
        }
    }
}, 1000*60*60)