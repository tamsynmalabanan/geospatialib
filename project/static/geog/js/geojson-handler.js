const handleGeoJSON = async (geojson, options={}) => {
    const crs = getGeoJSONCRS(geojson)

    geojson.features.forEach(async feature => {
        const geomAssigned = handleFeatureGeom(feature, options.defaultGeom)
        if (crs && !geomAssigned) {
            await handleFeatureCRS(feature, crs)
        }

        if (options.featureId) {
          handleFeatureId(feature)
        }
    })
      
    if (options.sort) {
        sortGeoJSONFeatures(geojson)
    }
}

const getGeoJSONCRS = (geojson) => {
    let crs
    
    if (geojson.crs) {
        const name = geojson.crs.properties.name
        if (name.includes('EPSG::')) {
            crs = parseInt(name.split('EPSG::')[1])            
        }
    }

    return crs
}

const handleFeatureGeom = (feature, defaultGeom) => {
    let geomAssigned = false

    if (!feature.geometry && defaultGeom) {
        feature.geometry = defaultGeom
        geomAssigned = true
    }

    return geomAssigned
}

const handleFeatureCRS = async (feature, crs) => {
    if (crs && crs !== 4326) {
        feature = transformFeatureGeometry(feature, crs, 4326)
    }
    return feature
}

const handleFeatureId = (feature) => {
    if (feature.id && feature.id !== '') {
        feature.properties.feature_id = feature.id
    }
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