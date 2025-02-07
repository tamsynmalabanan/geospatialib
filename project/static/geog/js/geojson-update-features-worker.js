self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('/static/geog/js/geojson-utils.js')

self.onmessage = (event) => {
    const { newGeoJSON, currentGeoJSON } = event.data
    
    if (currentGeoJSON) {
        
        const filterArea = turf.difference(turf.featureCollection([currentGeoJSON.mapBounds, newGeoJSON.mapBounds]))
        if (filterArea) {
            const filteredFeatures = currentGeoJSON.features.filter(feature => {
                if (!turf.booleanIntersects(filterArea, feature)) return false
                if (hasSimilarFeature(newGeoJSON.features, feature)) return false
                return true
            })
            
            if (filteredFeatures.length > 0) {
                newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
            }
        }
    }

    self.postMessage({geojson:newGeoJSON})
}