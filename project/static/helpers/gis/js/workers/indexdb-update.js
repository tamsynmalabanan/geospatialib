self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('/static/helpers/gis/js/geojson.js')

self.onmessage = (e) => {
    const {newGeoJSON, currentGeoJSON} = e.data
    
    if (currentGeoJSON) {
        const filteredFeatures = currentGeoJSON.features.filter(feature => {
            return !hasSimilarFeature(newGeoJSON.features, feature)
        })
        
        const newQueryIsPoint = turf.getType(newGeoJSON._queryGeom) === 'Point'
        const newQueryGeom = newQueryIsPoint ? turf.buffer(
            newGeoJSON._queryGeom, 1/100000
        ) : newGeoJSON._queryGeom
        
        if (filteredFeatures.length) {
            newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
            newGeoJSON._queryGeom = turf.union(turf.featureCollection([
                newQueryGeom,
                currentGeoJSON._queryGeom,
            ]))
        }
    }
    
    console.log(newGeoJSON)
    self.postMessage({geojson:newGeoJSON})
}