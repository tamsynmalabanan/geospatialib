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

    console.log(currentGeoJSON, currentQueryExtent, newGeoJSON, newQueryExtent)

    // console.log(newQueryExtent, turf.area(newQueryExtent))
    
    console.lof('filtering...')

    const filteredFeatures = currentGeoJSON.features.filter(feature => {
        return !hasSimilarFeature(newGeoJSON.features, feature)
    })
    console.lof('done filtering', filteredFeatures)
    
    if (filteredFeatures.length) {
        newGeoJSON.features = newGeoJSON.features.concat(filteredFeatures)
        const unionQueryExtent = turf.union(turf.featureCollection([
            newQueryExtent,
            currentQueryExtent,
        ]))
        console.lof(unionQueryExtent)
        newQueryExtent.type = unionQueryExtent.type
        newQueryExtent.coordinates = unionQueryExtent.coordinates
        console.log(newQueryExtent, turf.area(newQueryExtent))
    }

    self.postMessage({
        geojson: newGeoJSON,
        queryExtent: newQueryExtent,
    })
}