const handleGeoJSON = async (geojson, options={}) => {
    console.log('handling')
    const crs = getGeoJSONCRS(geojson)
    delete geojson.crs
    
    geojson.features.forEach(async feature => {
        const geomAssigned = options.defaultGeom ? handleFeatureGeom(feature, options.defaultGeom) : false
        crs && crs !== 4326 && !geomAssigned && await handleFeatureCRS(feature, crs)
        options.featureId && handleFeatureId(feature)
    })
    
    options.sort && sortGeoJSONFeatures(geojson)
    
    console.log('done handling')
    return geojson
}

const getGeoJSONCRS = (geojson) => {
    if (!geojson.crs) return
    const name = geojson.crs.properties.name
    if (!name.includes('EPSG::')) return
    return parseInt(name.split('EPSG::')[1])            
}

const handleFeatureGeom = (feature, defaultGeom) => {
    if (feature.geometry || !defaultGeom) return false
    feature.geometry = defaultGeom
    return true
}

const handleFeatureCRS = async (feature, crs) => {
    return crs && crs !== 4326 ? transformFeatureGeometry(feature, crs, 4326) : feature
}

const handleFeatureId = (feature) => {
    if (!feature.id || feature.id === '') return
    feature.properties.feature_id = feature.id
}

const sortGeoJSONFeatures = (geojson) => {
    geojson.features.sort((a, b) => {
        const featureTypeA = a.geometry.type;
        const featureTypeB = b.geometry.type;
    
        if (featureTypeA === 'Point' && featureTypeB !== 'Point') {
            return -1;
        } else if (featureTypeB === 'Point' && featureTypeA !== 'Point') {
            return 1;
        } else if (featureTypeA === 'MultiPoint' && featureTypeB !== 'MultiPoint') {
            return -1;
        } else if (featureTypeB === 'MultiPoint' && featureTypeA !== 'MultiPoint') {
            return 1;
        } else if (featureTypeA === 'LineString' && featureTypeB !== 'LineString') {
            return -1;
        } else if (featureTypeB === 'LineString' && featureTypeA !== 'LineString') {
            return 1;
        } else if (featureTypeA === 'MultiLineString' && featureTypeB !== 'MultiLineString') {
            return -1;
        } else if (featureTypeB === 'MultiLineString' && featureTypeA !== 'MultiLineString') {
            return 1;
        } else if (featureTypeA === 'Polygon' && featureTypeB !== 'Polygon') {
            return -1;
        } else if (featureTypeB === 'Polygon' && featureTypeA !== 'Polygon') {
            return 1;
        } else if (featureTypeA === 'MultiPolygon' && featureTypeB !== 'MultiPolygon') {
            return -1;
        } else if (featureTypeB === 'MultiPolygon' && featureTypeA !== 'MultiPolygon') {
            return 1;
        } else {
            return featureTypeA.localeCompare(featureTypeB);
        }
    });
}