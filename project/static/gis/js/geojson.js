const featuresAreSimilar = (feature1, feature2) => {
    if (feature1.geometry.type !== feature2.geometry.type) return false
    if (!turf.booleanIntersects(feature1, feature2)) return false
    if (!turf.booleanEqual(feature1.geometry, feature2.geometry)) return false
    if (!_.isEqual(feature1.properties, feature2.properties)) return false
    return true
}