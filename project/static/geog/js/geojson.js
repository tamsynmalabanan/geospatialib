const getDefaultGeoJSONLayer = (
    geojson={type: "FeatureCollection", features: []},
    options={}
) => {
    
    let color = options.color
    if (!color) {
        color = `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`
    }

    return L.geoJSON(geojson, {
        pointToLayer: (geoJsonPoint, latlng) => {
            return L.marker(latlng, {icon:getDefaultLayerStyle('point', {color:color})})
        },
        style: (geoJsonFeature) => {
            const params = {color:color}

            if (options.fillColor) {
                params.fillColor = options.fillColor
            }

            if (options.weight) {
                params.weight = options.weight
            }

            return getDefaultLayerStyle('other', params)
        },
        onEachFeature: (feature, layer) => {
            if (options.pane) {
                layer.options.pane = options.pane
            }

            if (options.getTitleFromLayer) {
                layer.title = getLayerTitle(layer)
            }

            if (options.bindTitleAsTooltip) {
                layer.bindTooltip(layer.title, {sticky:true})
            }

            if (Object.keys(feature.properties).length > 0) {
                const createPopup = () => {
                    const propertiesTable = createFeaturePropertiesTable(feature.properties, {
                            header:layer.popupHeader
                    })

                    const popup = layer.bindPopup(propertiesTable.outerHTML, {
                        autoPan: false,
                    })
                    
                    if (popup){
                        popup.openPopup()
                    }
                    
                    layer.off('click', createPopup)
                }

                layer.on('click', createPopup)
            }
        },
        pane: options.pane || 'overlayPane'
    })
}

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
        feature = transformFeatureGeometry(feature, crs, 4326)
    }
    return feature
}

const transformFeatureGeometry = async (feature, source, target) => {
    const coords = feature.geometry.coordinates
    feature.geometry.coordinates = await transformCoordinates(coords, source, target)
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