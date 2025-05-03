self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')

self.onmessage = (e) => {
    const {
        dbKey,
        queryGeom,
        zoom=20,
        filters={},
        groups={},
    } = e.data
    

    self.postMessage({geojson})
}