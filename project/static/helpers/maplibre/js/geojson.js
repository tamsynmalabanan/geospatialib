const normalizeGeoJSON = async (geojson, {
    controller,
    defaultGeom,
} = {}) => {
    if (!geojson) return
    
    let crs
    if (geojson.crs) {
        const crsInfo = geojson.crs.properties?.name?.toLowerCase().replace('::', ':').split('epsg:')
        crs = crsInfo?.length ? parseInt(crsInfo[1]) : null
        delete geojson.crs   
    }
    
    if (!defaultGeom || !turf.booleanValid(defaultGeom)) {
        geojson.features = geojson.features.filter(f => f.geometry)
    }
    
    for (const feature of geojson.features) {
        if (controller?.signal.aborted) return
        await normalizeGeoJSONFeature(feature, {defaultGeom, crs})
    }
    
    return geojson
}

const normalizeGeoJSONFeature = async (feature, {
    defaultGeom,
    crs,
}={}) => {
    const geomIsValid = feature.geometry && turf.booleanValid(feature.geometry)
    
    if (geomIsValid && crs && crs !== 4326) {
        await transformGeoJSONCoordinates(feature.geometry.coordinates, crs, 4326)     
    }
    
    if (!geomIsValid && defaultGeom) {
        feature.geometry = defaultGeom
    }

    normalizeFeatureProperties(feature)
    await updateFeatureMetadata(feature)
}

const normalizeFeatureProperties = (feature) => {
    const properties = feature.properties ?? {}
    const normalProperties = {}

    const handler = (properties, prefix='') => {
        prefix = prefix.trim()

        Object.keys(properties).forEach(property => {
            const name = prefix ? `${prefix}_${property}` : property
            const value = properties[property]
            
            if (Array.isArray(value) && value.every(i => typeof i !== 'object')) {
                normalProperties[name] = value.map(i => String(i)).join(', ')
            } else if (value && typeof value === 'object') {
                handler(value, prefix=name)
            } else {
                normalProperties[name] = value
            }
        })
    }

    handler(properties)    

    feature.properties = normalProperties
}

const updateFeatureMetadata = async (feature) => {
    const metadata = feature.metadata = feature.metadata ?? {}

    if (feature.id) {
        metadata.feature_id = feature.id
    }

    const geomType = feature.geometry?.type
    
    if (geomType) {
        metadata.geom_type = geomType
        
        try {        
            const [x,y] = (
                geomType === 'Point' 
                ? feature.geometry.coordinates 
                : turf.centroid(feature).geometry.coordinates
            )
            metadata.x = x
            metadata.y = y
        } catch {}

        if (geomType.includes('Polygon')) {
            try {
                metadata.area_sqm = turf.area(feature).toFixed(3)
            } catch {}
            
            try {
                metadata.perimeter_m = (turf.length(turf.polygonToLine(feature))*1000).toFixed(3)
            } catch {}
        }
    
        if (geomType.includes('LineString')) {
            try {
                metadata.length_m = (turf.length(feature)*1000).toFixed(3)
            } catch {}
        }

        try {
            metadata.bbox = turf.bbox(feature)
        } catch {}
    }

    if (!metadata.gsl_id) {
        await assignFeatureMetadataId(feature)
    }
}

const assignFeatureMetadataId = async (feature) => {
    feature.metadata.gsl_id = await hashJSON({...feature.properties, ...feature.metadata})
    return feature
}