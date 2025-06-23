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
    id = `client;${generateRandomString()}`, 
    queryExtent = gisData?.type === 'FeatureCollection' ? turf.bboxPolygon(turf.bbox(gisData)).geometry : null, 
    expirationDays=7,
}={}) => {
    if (!gisData) return

    const request = requestGISDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['gis'], 'readwrite')
        const objectStore = transaction.objectStore('gis')
        const expirationTime = Date.now() + (expirationDays*1000*60*60*24)
        objectStore.put({id, gisData, queryExtent, expirationTime})
    }

    return id
}

const updateGISDB = async (id, newGISData, newQueryExtent) => {
    const save = (data) => {
        const {gisData, queryExtent} = data
        if (data) saveToGISDB(gisData, {id, queryExtent})
    }
    
    const cachedData = await getFromGISDB(id, {save:false})
    if (!cachedData) {
        return save({
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
        }
    }
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
                console.log('gisDataRequest.onsuccess',e)
                const result = e.target.result
                if (!result) reject(null)
                
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