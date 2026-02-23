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
                    filteredFeatures = fewerData.features.filter(f1 => {
                        if (!turf.booleanIntersects(f1, intersection)) return true
                        return !intersectedFeatures.find(f2 => {
                            if (f1.geometry.type !== f2.geometry.type) return false
    
                            try {
                                if (!turf.booleanIntersects(f1, f2)) return false
                            } catch {}

                            try {
                                if (!turf.booleanEqual(f1.geometry, f2.geometry)) return false
                            } catch {}
                            
                            if (!_.isEqual(f1.properties, f2.properties)) return false
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