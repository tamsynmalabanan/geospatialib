self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('/static/geog/js/geojson-utils.js')

self.onmessage = async (event) => {
    const { id, geojson, currentGeoJSON } = event.data
    console.log(id, geojson, currentGeoJSON)

    const requestGeoJSONDB = async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('geojsonDB', 1)

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains('geojsons')) {
                    db.createObjectStore('geojsons', { keyPath: 'id' })
                }
            }

            request.onsuccess = (event) => resolve(event.target.result)
            request.onerror = (event) => reject(event.target.errorCode)
        })
    }

    const db = await requestGeoJSONDB()
    const transaction = db.transaction(['geojsons'], 'readwrite')
    const objectStore = transaction.objectStore('geojsons')
    console.log(objectStore)
    
    if (currentGeoJSON) {
        const filterArea = turf.difference(turf.featureCollection([currentGeoJSON.mapBounds, geojson.mapBounds]))
        console.log(filterArea)
        if (filterArea) {
            const filteredFeatures = currentGeoJSON.features.filter(feature => {
                if (!turf.booleanIntersects(filterArea, feature)) return false
                if (hasSimilarFeature(geojson.features, feature)) return false
                return true
            })
            
            console.log(filteredFeatures)
            if (filteredFeatures.length > 0) {
                geojson.features = geojson.features.concat(filteredFeatures)
            }
        }
    }

    console.log(geojson)
    const putRequest = objectStore.put({ id, geojson })
    putRequest.onsuccess = () => console.log('put success', geojson)
    putRequest.onerror = (error) => console.log('put failed', error)

    self.postMessage({ success: true })
}