self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('/static/helpers/gis/js/geojson.js')

self.onmessage = (e) => {
    const {newGeoJSON, currentGeoJSON} = e.data

    if (currentGeoJSON) {
        const filteredFeatures = currentGeoJSON.features.filter(feature => {
            return !hasSimilarFeature(newGeoJSON.features, feature)
        })
        
        if (filteredFeatures.length) {
            newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
        }
    }

    self.postMessage({geojson:newGeoJSON})
}