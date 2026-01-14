self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js')

self.onmessage = (e) => {
    const {
        data, 
        extent,
        storedData,
        storedExtent,
    } = e.data

    let workingData = data
    let workingExtent = extent

    try {
        if (turf.flatten(storedExtent).features.some(f => !turf.booleanContains(extent, f))) {
            let extents = turf.featureCollection([
                turf.feature(storedExtent),
                turf.feature(extent),
            ])
            workingExtent = turf.union(extents).geometry
    
            let fewerData
            [fewerData, workingData] = Array(data, storedData).sort((a, b) => {
                const countA = Array.isArray(a.features) ? a.features.length : 0
                const countB = Array.isArray(b.features) ? b.features.length : 0
                return countA - countB
            })
        
            let filteredFeatures = fewerData.features
            if (turf.booleanIntersects(storedExtent, extent)) {
                const intersection = turf.intersect(extents)
                if (intersection) {
                    const intersectedFeatures = workingData.features.filter(f => turf.booleanIntersects(f, intersection))
                    filteredFeatures = fewerData.features.filter(feature1 => {
                        if (!turf.booleanIntersects(feature1, intersection)) return true
                        return !intersectedFeatures.find(feature2 => {
                            if (feature1.geometry.type !== feature2.geometry.type) return false
                            if (!turf.booleanIntersects(feature1, feature2)) return false
                            if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
                            if (!_.isEqual(feature1.properties, feature2.properties)) return false
                            return true
                        })
                    })
                }
            }
    
            if (filteredFeatures.length) {
                workingData.features = workingData.features.concat(filteredFeatures)
            }
        }
    } catch (err) {
        console.log(err)
    }
    
    self.postMessage({
        data: workingData,
        extent: workingExtent,
    })
}