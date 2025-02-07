const requestGeoJSONDB = async () => {
    await deleteExpiredGeoJSON()

    const request = indexedDB.open('geojsonDB', 1)
    request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('geojsons')) {
            db.createObjectStore('geojsons', { keyPath: 'id' })
        }
    }
    
    return request
}

// const saveToGeoJSONDB = (id, geojson, expiration=1000*60*60) => {
const saveToGeoJSONDB = (id, geojson, expiration=1000*10) => {
    const request = requestGeoJSONDB()
    request.onsuccess = (event) => {
        const db = event.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')

        const expirationTime = Date.now() + expiration
        objectStore.put({ id, geojson, expirationTime })
    }
}

const updateGeoJSONOnDB = async (id, newGeoJSON) => {
    const worker = new Worker('/static/geog/js/workers/geojson-update-features.js')

    worker.onmessage = (event) => {
        const geojson = event.data.geojson
        if (geojson) {
            saveToGeoJSONDB(id, geojson)
        }
        worker.terminate()
    }
    
    worker.onerror = (error) => {
        worker.terminate()
    }
    
    const currentGeoJSON = await getFromGeoJSONDB(id)
    worker.postMessage({ newGeoJSON, currentGeoJSON })
}

const getFromGeoJSONDB = async (id) => {
    return new Promise((resolve, reject) => {
        const request = requestGeoJSONDB()
  
        request.onsuccess = (event) => {
            const db = event.target.result
            const transaction = db.transaction(['geojsons'], 'readonly')
            const objectStore = transaction.objectStore('geojsons')
            const geojsonRequest = objectStore.get(id)
    
            geojsonRequest.onsuccess = (event) => {
                const result = event.target.result
                if (result) {
                    resolve(result.geojson)
                } else {
                    resolve(null)
                }
            }
    
            geojsonRequest.onerror = (event) => {
                reject(event.target.errorCode)
            }
        }
  
        request.onerror = (event) => {
            reject(event.target.errorCode)
        }
    })
}

const deleteFromGeoJSONDB = (id) => {
    const request = requestGeoJSONDB()
    
    request.onsuccess = (event) => {
        const db = event.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')
        const deleteRequest = objectStore.delete(id)
    
        deleteRequest.onsuccess = () => {
            // console.log('GeoJSON deleted successfully!')
        }
    
        deleteRequest.onerror = (event) => {
            // console.error('GeoJSON deletion error:', event.target.errorCode)
        }
    }
  
    request.onerror = (event) => {
        // console.error('Database error:', event.target.errorCode)
    }
}

const deleteExpiredGeoJSON = async () => {
    const request = requestGeoJSONDB()
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['geojsons'], 'readwrite');
        const objectStore = transaction.objectStore('geojsons');
        
        objectStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const currentTime = Date.now();
                if (cursor.value.expirationTime && cursor.value.expirationTime < currentTime) {
                    objectStore.delete(cursor.key);
                }
                cursor.continue();
            }
        };
    }
}