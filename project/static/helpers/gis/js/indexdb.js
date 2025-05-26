const requestGeoJSONDB = () => {
    const request = indexedDB.open('geojsonDB', 1)

    request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('geojsons')) {
            db.createObjectStore('geojsons', { keyPath: 'id' })
        }
    }
    
    return request
}

const saveToGeoJSONDB = (geojson, {
    id = `client;${generateRandomString()}`, 
    queryExtent, 
    expirationDays=7,
    normalize=false,
}={}) => {
    if (!geojson) return

    const request = requestGeoJSONDB()
    request.onsuccess = async (e) => {
        const db = e.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')

        if (normalize) {
            await normalizeGeoJSON(geojson)
            queryExtent = turf.bboxPolygon(turf.bbox(geojson)).geometry
        }

        const expirationTime = Date.now() + (expirationDays*1000*60*60*24)

        console.log(id, geojson, queryExtent, expirationTime)
        objectStore.put({id, geojson, queryExtent, expirationTime})
    }

    return id
}

const updateGeoJSONOnDB = async (id, newGeoJSON, newQueryExtent) => {
    const save = (data) => {
        const {geojson, queryExtent} = data
        if (data) saveToGeoJSONDB(geojson, {id, queryExtent})
    }
    
    const cachedData = await getFromGeoJSONDB(id, {save:false})
    if (!cachedData) {
        return save({
            geojson:newGeoJSON, 
            queryExtent:newQueryExtent,
        })
    } else {
        const worker = new Worker('/static/helpers/gis/js/workers/indexdb-update.js')

        worker.postMessage({
            newGeoJSON, 
            newQueryExtent,
            currentGeoJSON: cachedData.geojson,
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

const getFromGeoJSONDB = async (id, {save=true}={}) => {
    return new Promise((resolve, reject) => {
        const request = requestGeoJSONDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['geojsons'], 'readonly')
            const objectStore = transaction.objectStore('geojsons')
            const geojsonRequest = objectStore.get(id)
    
            geojsonRequest.onsuccess = (e) => {
                const result = e.target.result
                if (!result) return resolve(null)

                const {geojson, queryExtent} = result
                if (save) saveToGeoJSONDB(geojson, {id, queryExtent})
                resolve({geojson:turf.clone(geojson), queryExtent})
            }
    
            geojsonRequest.onerror = (e) => {
                reject(e.target.errorCode)
            }
        }
  
        request.onerror = (e) => {
            reject(e.target.errorCode)
        }
    })
}

const deleteFromGeoJSONDB = (id) => {
    const request = requestGeoJSONDB()
    
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')
        const deleteRequest = objectStore.delete(id)
    
        deleteRequest.onsuccess = () => {
            // console.log('GeoJSON deleted successfully!')
        }
    
        deleteRequest.onerror = (e) => {
            // console.error('GeoJSON deletion error:', e.target.errorCode)
        }
    }
  
    request.onerror = (e) => {
        // console.error('Database error:', e.target.errorCode)
    }
}

setInterval(async () => {
    const request = requestGeoJSONDB()

    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')
        
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