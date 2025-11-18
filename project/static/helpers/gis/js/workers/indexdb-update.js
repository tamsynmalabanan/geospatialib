self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js')

const featuresAreSimilar = (feature1, feature2) => {
    if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
    if (!_.isEqual(feature1.properties, feature2.properties)) return false
    return true
}

self.onmessage = (e) => {
    const {
        newGISData, 
        newQueryExtent,
        currentGISData,
        currentQueryExtent,
    } = e.data
    
    const queryExtent = turf.union(turf.featureCollection([
        turf.feature(currentQueryExtent),
        turf.feature(newQueryExtent),
    ])).geometry

    const [fewerData, gisData] = Array(newGISData, currentGISData).sort((a, b) => {
        const countA = Array.isArray(a.features) ? a.features.length : 0
        const countB = Array.isArray(b.features) ? b.features.length : 0
        return countA - countB
    })

    try {
        const filteredData = fewerData.features.filter(feature1 => {
            return !gisData.features.find(feature2 => featuresAreSimilar(feature1, feature2))
        })

        if (filteredData.length) {
            gisData.features = gisData.features.concat(filteredData)
        }
    } catch (error) {
        console.log(error, e.data)
    }
    
    self.postMessage({
        gisData,
        queryExtent,
    })
}