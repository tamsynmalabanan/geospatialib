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
    const {
        newGeoJSON, 
        newQueryExtent,
        currentGeoJSON,
        currentQueryExtent,
    } = e.data
    
    const filteredFeatures = currentGeoJSON.features.filter(feature => {
        return !hasSimilarFeature(newGeoJSON.features, feature)
    })
    
    if (filteredFeatures.length) {
        newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
        const unionQueryExtent = turf.union(turf.featureCollection([
            turf.feature(newQueryExtent),
            turf.feature(currentQueryExtent),
        ])).geometry
        newQueryExtent.type = unionQueryExtent.type
        newQueryExtent.coordinates = unionQueryExtent.coordinates
    }

    self.postMessage({
        geojson:newGeoJSON,
        queryExtent:newQueryExtent,
    })
}