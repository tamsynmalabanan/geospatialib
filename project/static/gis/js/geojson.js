const featuresAreSimilar = (f1, f2) => {
    if (f1.geometry.type !== f2.geometry.type) return false
    
    try {
        if (!turf.booleanIntersects(f1, f2)) return false
    } catch {}

    try {
        if (!turf.booleanEqual(f1.geometry, f2.geometry)) return false
    } catch {}
    
    if (!_.isEqual(f1.properties, f2.properties)) return false
    return true
}

const normalizeGeoJSON = async (geojson) => {
    if (!geojson?.features?.length) return
    
    geojson.features = geojson.features.filter(f => f.geometry)

    if (geojson.crs) {
        const srid = parseInt(
            geojson.crs?.properties?.name
            ?.toLowerCase().replace('::', ':')
            ?.split('epsg:', 2)?.pop()
        )
        
        if (!isNaN(srid)) {
            delete geojson.crs
            if (srid !== 4326) {
                geojson = await transformCoordinates(geojson, srid, 4326)
            }   
        }
    }

    for (const f of geojson.features) {
        delete f.properties.__sys__

        f.properties = normalizeProperties(f)

        f.properties.__sys__ = {
            id: await hashJSON(turf.feature(f.geometry, f.properties))
        }
    }
}

const normalizeProperties = (feature) => {
    const properties = feature.properties ?? {}
    const normalProperties = {}

    const handler = (properties, prefix='') => {
        prefix = prefix.trim()

        Object.entries(properties).forEach(([property, value]) => {
            const name = prefix ? `${prefix}_${property}` : property
            
            if (Array.isArray(value) && !value.find(i => typeof i === 'object')) {
                normalProperties[name] = value.map(i => String(i)).join(', ')
            } else if (value && typeof value === 'object') {
                handler(value, prefix=name)
            } else {
                normalProperties[name] = value
            }
        })
    }

    handler(properties)    

    return normalProperties
}

const transformCoordinates = async (geojson, source, target) => {
    const source_crs = `EPSG:${source}`
    if (!proj4.defs(source_crs)) {
        await fetchProj4Def(source)
    }
        
    const target_crs = `EPSG:${target}`
    if (!proj4.defs(target_crs)) {
        await fetchProj4Def(target)
    }

    if (proj4.defs(source_crs) && proj4.defs(target_crs)) {
        turf.coordEach(geojson, (currentCoord) => {
            const transformed = proj4(source_crs, target_crs, currentCoord.slice(0,3))
            currentCoord[0] = transformed[0]
            currentCoord[1] = transformed[1]
            if (transformed.length > 2) {
                currentCoord[2] = transformed[2]
            }
        })
    }

    return geojson
}

const fetchProj4Def = async (srid) => {
    return await customFetch(`https://spatialreference.org/ref/epsg/${srid}/ogcwkt`, {
        callback: async (response) => {
            const def = await response.text()
            const crs = `EPSG:${srid}`
            proj4.defs(crs, def)
            return proj4.defs(crs)
        },
    }).catch(error => {
        console.error(error)
    })
}