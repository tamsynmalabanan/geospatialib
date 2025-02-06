const requestGeoJSONDB = () => indexedDB.open('geojsonDB', 1)

requestGeoJSONDB().onupgradeneeded = (event) => {
    const db = event.target.result
    
    if (db.objectStoreNames.contains('geojsons')) return
    db.createObjectStore('geojsons', {keyPath:'id'})
}

const saveToGeoJSONDB = (id, geojson) => {
    const request = requestGeoJSONDB()
  
    request.onsuccess = (event) => {
        const db = event.target.result
        const transaction = db.transaction(['geojsons'], 'readwrite')
        const objectStore = transaction.objectStore('geojsons')
        objectStore.put({ id, geojson })
    }
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
                    // console.log('GeoJSON retrieved successfully:', result.geojson)
                    resolve(result.geojson)
                } else {
                    // console.log('No GeoJSON found with ID:', id)
                    resolve(null)
                }
            }
    
            geojsonRequest.onerror = (event) => {
                // console.error('GeoJSON retrieval error:', event.target.errorCode)
                reject(event.target.errorCode)
            }
        }
  
        request.onerror = (event) => {
            // console.error('Database error:', event.target.errorCode)
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