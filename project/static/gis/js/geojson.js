const featuresAreSimilar = (f1, f2) => {
    if (f1.geometry.type !== f2.geometry.type) return false
    if (!turf.booleanIntersects(f1, f2)) return false
    if (!turf.booleanEqual(f1.geometry, f2.geometry)) return false
    if (!_.isEqual(f1.properties, f2.properties)) return false
    return true
}

const normalizeGeoJSON = async (geojson) => {
    for (const f of geojson.features) {
        if (!f.properties.__id__) {
            f.properties.__id__ = await hashJSON(turf.feature(f.geometry, f.properties))
        }
    }
}

const isSystemProperty = (string) => /^__.*__$/.test(string)