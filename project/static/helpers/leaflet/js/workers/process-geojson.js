self.importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js')
self.importScripts('/static/helpers/leaflet/js/validate-geojson-feature.js')

const sortGeoJSONFeatures = (geojson, { reverse = false } = {}) => {
    if (!geojson?.features?.length) return
    
    geojson.features.sort((a, b) => {
        const featureOrder = [
            "Point",
            "MultiPoint",
            "LineString",
            "MultiLineString",
            "Polygon",
            "MultiPolygon",
        ]
        const typeComparison = featureOrder.indexOf(a.geometry.type) - featureOrder.indexOf(b.geometry.type)
        const rankComparison = (a.properties.__groupRank__ ?? 0) - (b.properties.__groupRank__ ?? 0)

        const comparison = (
            typeComparison !== 0 ? typeComparison : 
            rankComparison !== 0 ? rankComparison : 
            (a.properties?.name ?? '').localeCompare(b.properties?.name ?? '')
        )

        return reverse ? -comparison : comparison
    })
}

self.onmessage = (e) => {
    const {
        data,
        queryExtent,
        filters,
        groups,
        simplify
    } = e.data
    
    if (queryExtent) {
        data.features = data.features.filter(feature => {
            return turf.booleanIntersects(queryExtent, feature)
        })
    }
    
    if (filters.some(i => {
        if (!i.active) return false
        return Object.values(i.values).some(j => {
            if (!j.hasOwnProperty('active')) return true
            return j.active
        })
    })) {
        data.features = data.features.filter(feature => {
            return validateGeoJSONFeature(feature, filters)
        })
    }

    if (groups.some(i => i[1].active)) {
        data.features.forEach(feature => {
            const properties = feature.properties
            for (const [id, group] of groups) {
                if (!group.active || !validateGeoJSONFeature(feature, group.filters ?? {})) continue
                properties.__groupId__ = id
                properties.__groupRank__ = group.rank
                break
            }

            if (!properties.__groupId__) properties.__groupId__ = ''
            if (!properties.__groupRank__) properties.__groupRank__ = groups.length + 1
        })
    }

    sortGeoJSONFeatures(data, {reverse:true})

    if (simplify) {
        // simplify / cluster if not query // reconfigure legend feature count
    }

    console.log(data)

    self.postMessage({data})
}