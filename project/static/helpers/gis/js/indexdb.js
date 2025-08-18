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

const createLocalLayerDBKey = ({
    id = generateRandomString(64),
    name = 'new layer',
    version = 1
}={}) => `local;${JSON.stringify({id, name})}--version${version}`

const saveToGISDB = async (gisData, {
    id,
    name,
    queryExtent, 
    expirationDays=7,
}={}) => {
    if (!gisData) return

    if (!id) {
        const currentIds = await getAllGISDBKeys()
        while (!id || currentIds.includes(id)) {
            id = createLocalLayerDBKey({name})
        }
    }

    if (!queryExtent && gisData.type === 'FeatureCollection') {
        queryExtent = turf.bboxPolygon(turf.bbox(gisData)).geometry
    }

    const expirationTime = Date.now() + (expirationDays*1000*60*60*24)

    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        objectStore.put({id, gisData, queryExtent, expirationTime})
    }

    return id
}

const updateGISDB = async (id, newGISData, newQueryExtent) => {
    return new Promise(async (resolve, reject) => {
        const save = async (data) => {
            const {gisData, queryExtent} = data
            if (data) await saveToGISDB(gisData, {id, queryExtent})
            resolve(id)
        }
        
        const cachedData = await getFromGISDB(id, {save:false})
        if (!cachedData) {
            await save({
                gisData: newGISData, 
                queryExtent: newQueryExtent,
            })
        } else {
            const worker = new Worker('/static/helpers/gis/js/workers/indexdb-update.js')
    
            worker.postMessage({
                newGISData, 
                newQueryExtent,
                currentGISData: cachedData.gisData,
                currentQueryExtent: cachedData.queryExtent,
            })
    
            worker.onmessage = async (e) => {
                await save(e.data)
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
    
            gisDataRequest.onsuccess = async (e) => {
                const result = e.target.result
                if (!result) return resolve(null)
                
                const {gisData, queryExtent} = result
                if (save) await saveToGISDB(gisData, {id, queryExtent})
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

const clearGISDB = () => {
    const request = requestGISDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        
        const clearRequest = objectStore.clear();

        clearRequest.onsuccess = function () {
            console.log('All items deleted successfully.');
        }

        clearRequest.onerror = function (event) {
            console.error('Error deleting items:', event.target.error);
        }
    }
  
    request.onerror = (e) => {
    }
}

// setInterval(async () => {
//     const request = requestGISDB()

//     request.onsuccess = (e) => {
//         const db = e.target.result
//         const transaction = db.transaction(['gis'], 'readwrite')
//         const objectStore = transaction.objectStore('gis')
        
//         objectStore.openCursor().onsuccess = (e) => {
//             const cursor = e.target.result
//             if (!cursor) return 
            
//             const currentTime = Date.now()
//             if (cursor.value.expirationTime && cursor.value.expirationTime < currentTime) {
//                 objectStore.delete(cursor.key)
//             }
//             cursor.continue()
//         }
//     }
// }, 1000*60*60)