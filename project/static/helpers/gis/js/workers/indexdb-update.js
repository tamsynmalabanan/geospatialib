self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js')

const cleanFeatureProperties = (properties) => {
    return Object.fromEntries(Object.entries(properties).filter(([key]) => {
        return !(key.startsWith('__') && key.endsWith('__'))
    }))
}

const featuresAreSimilar = (feature1, feature2) => {
    if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
    if (!_.isEqual(...[feature1, feature2].map(i => cleanFeatureProperties(i.properties)))) return false
    return true
}

self.onmessage = (e) => {
    const {
        newGISData, 
        newQueryExtent,
        currentGISData,
        currentQueryExtent,
    } = e.data
    
    try {
        const filteredFeatures = currentGISData.features.filter(feature1 => {
            return !newGISData.features.find(feature2 => featuresAreSimilar(feature1, feature2))
        })

        if (filteredFeatures.length) {
            newGISData.features = newGISData.features.concat(filteredFeatures)
            const unionQueryExtent = turf.union(turf.featureCollection([
                turf.feature(newQueryExtent),
                turf.feature(currentQueryExtent),
            ])).geometry
            newQueryExtent.type = unionQueryExtent.type
            newQueryExtent.coordinates = unionQueryExtent.coordinates
        }
    } catch (error) {
        console.log(error, e.data)
    }
    
    self.postMessage({
        gisData:newGISData,
        queryExtent:newQueryExtent,
    })
}