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

const saveToGeoJSONDB = (id, geojson, expirationDays=1) => {
    const request = requestGeoJSONDB()
    request.onsuccess = (e) => {
        const db = e.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')

        const expirationTime = Date.now() + (expirationDays*1000*60*60*24)
        objectStore.put({id, geojson, expirationTime})
    }
}

const updateGeoJSONOnDB = async (id, newGeoJSON) => {
    const worker = new Worker('/static/helpers/gis/js/workers/indexdb-update.js')

    worker.onmessage = (e) => {
        console.log(e)
        const geojson = e.data.geojson
        if (geojson) saveToGeoJSONDB(id, geojson)
        worker.terminate()
    }
    
    worker.onerror = (error) => {
        console.log(error)
        worker.terminate()
    }
    
    const currentGeoJSON = await getFromGeoJSONDB(id)
    worker.postMessage({newGeoJSON, currentGeoJSON})
}

const getFromGeoJSONDB = async (id) => {
    return new Promise((resolve, reject) => {
        const request = requestGeoJSONDB()
  
        request.onsuccess = (e) => {
            const db = e.target.result
            const transaction = db.transaction(['geojsons'], 'readonly')
            const objectStore = transaction.objectStore('geojsons')
            const geojsonRequest = objectStore.get(id)
    
            geojsonRequest.onsuccess = (e) => {
                const result = e.target.result
                result ? resolve(result.geojson) : resolve(null)
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