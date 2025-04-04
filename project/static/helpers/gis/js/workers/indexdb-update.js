self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')

const featuresAreSimilar = (feature1, feature2) => {
    const propertiesEqual = JSON.stringify(feature1.properties) === JSON.stringify(feature2.properties)
    const geometriesEqual = turf.booleanEqual(feature1.geometry, feature2.geometry)
    return propertiesEqual && geometriesEqual
}

const hasSimilarFeature = (featureList, targetFeature) => {
    for (const feature of featureList) {
        if (featuresAreSimilar(feature, targetFeature)) return true
    }

    return false
}

self.onmessage = (e) => {
    const {newGeoJSON, currentGeoJSON} = e.data
    
    if (currentGeoJSON) {
        const filteredFeatures = currentGeoJSON.features.filter(feature => {
            return !hasSimilarFeature(newGeoJSON.features, feature)
        })
        
        const newQueryIsPoint = turf.getType(newGeoJSON._queryExtent) === 'Point'
        const newQueryExtent = newQueryIsPoint ? turf.buffer(
            newGeoJSON._queryExtent, 1/100000
        ) : newGeoJSON._queryExtent
        
        if (filteredFeatures.length) {
            newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
            newGeoJSON._queryExtent = turf.union(turf.featureCollection([
                newQueryExtent,
                currentGeoJSON._queryExtent,
            ]))
        }
    }

    self.postMessage({geojson:newGeoJSON})
}