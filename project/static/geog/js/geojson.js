const handleFeatureGeom = (feature, defaultGeom) => {
    let geomAssigned = false

    if (!feature.geometry && defaultGeom) {
        feature.geometry = defaultGeom
        geomAssigned = true
    }

    return geomAssigned
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

const handleFeatureCRS = async (feature, crs) => {
    if (crs && crs !== 4326) {
        const coords = feature.geometry.coordinates
        feature.geometry.coordinates = await transformCoordinatesToEPSG4326(coords, crs)
    } else {
        console.log('exception: ', crs)
    }
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

const handleGeoJSON = async (geojson, options={}) => {
    const crs = getGeoJSONCRS(geojson)

    geojson.features.forEach(async feature => {
        const geomAssigned = handleFeatureGeom(feature, options.defaultGeom)
        console.log(geomAssigned)
        if (!geomAssigned) {
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

const downloadGeoJSON = (geojson, file_name) => {
    const blob = new Blob([geojson], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file_name}.geojson`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}