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
        newGISData, 
        newQueryExtent,
        currentGISData,
        currentQueryExtent,
    } = e.data

    console.log(1, newGISData, currentGISData)
    
    const filteredFeatures = currentGISData.features.filter(feature => {
        return !hasSimilarFeature(newGISData.features, feature)
    })

    console.log(2, filteredFeatures)
    
    if (filteredFeatures.length) {
        newGISData.features = newGISData.features.concat(filteredFeatures)
        const unionQueryExtent = turf.union(turf.featureCollection([
            turf.feature(newQueryExtent),
            turf.feature(currentQueryExtent),
        ])).geometry
        newQueryExtent.type = unionQueryExtent.type
        newQueryExtent.coordinates = unionQueryExtent.coordinates
    }
    
    console.log(3, newGISData, newQueryExtent)


    self.postMessage({
        gisData:newGISData,
        queryExtent:newQueryExtent,
    })
}