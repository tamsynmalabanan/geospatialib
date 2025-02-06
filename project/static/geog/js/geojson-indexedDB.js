const requestGeoJSONDB = () => {
    const request = indexedDB.open('geojsonDB', 1)

    request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('geojsons')) {
            db.createObjectStore('geojsons', { keyPath: 'id' })
        }
    }
    
    return request
}

const saveToGeoJSONDB = async (id, geojson) => {
    const currentGeoJSON = await getFromGeoJSONDB(id)
    
    return new Promise((resolve, reject) => {
        const worker = new Worker('/static/geog/js/geojson-saveToGeoJSONDB-worker.js');

        worker.onmessage = (event) => {
            if (event.data.success) {
                resolve();
            } else {
                reject(event.data.error);
            }
            worker.terminate();
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };

        worker.postMessage({ id, geojson, currentGeoJSON });
    });
  
    // const request = requestGeoJSONDB()
    // request.onsuccess = (event) => {
    //     const db = event.target.result
    //     const transaction = db.transaction(['geojsons'], 'readwrite')
    //     const objectStore = transaction.objectStore('geojsons')

    //     if (currentGeoJSON) {
    //         const filterArea = turf.difference(turf.featureCollection([currentGeoJSON.mapBounds, geojson.mapBounds]))
    //         if (filterArea) {
    //             const filteredFeatures = currentGeoJSON.features.filter(feature => {
    //                 if (!turf.booleanIntersects(filterArea, feature)) return false
    //                 if (hasSimilarFeature(geojson.features, feature)) return false
    //                 return true
    //             })

    //             if (filteredFeatures.length > 0) {
    //                 geojson.features = geojson.features.concat(filteredFeatures)
    //             }
    //         }
    //     }

    //     objectStore.put({ id, geojson })
    // }
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