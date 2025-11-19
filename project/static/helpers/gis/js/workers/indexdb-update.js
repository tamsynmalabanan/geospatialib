self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js')

self.onmessage = (e) => {
    const {
        newGISData, 
        newQueryExtent,
        currentGISData,
        currentQueryExtent,
    } = e.data

    let gisData = newGISData
    let queryExtent = newQueryExtent

    try {
        if (turf.flatten(currentQueryExtent).features.some(f => !turf.booleanContains(newQueryExtent, f))) {
            let extents = turf.featureCollection([
                turf.feature(currentQueryExtent),
                turf.feature(newQueryExtent),
            ])
            queryExtent = turf.union(extents).geometry
    
            let fewerData
            [fewerData, gisData] = Array(newGISData, currentGISData).sort((a, b) => {
                const countA = Array.isArray(a.features) ? a.features.length : 0
                const countB = Array.isArray(b.features) ? b.features.length : 0
                return countA - countB
            })
        
            let filteredFeatures = []
            if (turf.booleanIntersects(currentQueryExtent, newQueryExtent)) {
                const intersection = turf.intersect(extents)
                if (intersection) {
                    const intersectedFeatures = gisData.features.filter(f => turf.booleanIntersects(f, intersection))
                    filteredFeatures = fewerData.features.filter(feature1 => {
                        if (!turf.booleanIntersects(feature1, intersection)) return true
        
                        return !intersectedFeatures.find(feature2 => {
                            if (!turf.booleanIntersects(feature1, feature2)) return false
                            if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
                            if (!_.isEqual(feature1.properties, feature2.properties)) return false
                            return true
                        })
                    })
                }
            }
    
            if (filteredFeatures.length) {
                gisData.features = gisData.features.concat(filteredFeatures)
            }
        }
    } catch (err) {
        console.log(err)
    }
    
    self.postMessage({
        gisData,
        queryExtent,
    })
}