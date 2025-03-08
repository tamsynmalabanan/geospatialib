const getDefaultLeafletGeoJSONLayer = ({
    color,
} = {}) => {
    color = color || generateRandomColor()

    const geojsonLayer =  L.geoJSON(turf.featureCollection([]), {
        style: (feature) => {
            return getDefaultLayerStyle('other', {
                color: color,
                fillColor: options.fillColor,
                weight: options.weight,
            })
        },
    })

    const getIconSize = () => geojsonLayer._map ? (() => {
        const mapZoom = geojsonLayer._map.getZoom()
        return mapZoom > 15 ? 15 : mapZoom < 5 ? 5 : mapZoom
    })() : 10

    geojsonLayer.options.pointToLayer = (geoJsonPoint, latlng) => {
        const iconSize = getIconSize()
        return L.marker(latlng, {icon:getDefaultLayerStyle('point', {
            color:color,
            colorOpacity:0.5,
            iconSize: [iconSize, iconSize]
        })})
    }

    const pane = options.pane
    if (pane) {
        geojsonLayer.options.pane = pane
    }

    geojsonLayer.options.onEachFeature = (feature, layer) => {
        const pane = geojsonLayer.options.pane
        if (pane) {
            layer.options.pane = pane
        }

        if (options.getTitleFromLayer) {
            layer.title = getLayerTitle(layer)
        }

        if (options.bindTitleAsTooltip) {
            layer.bindTooltip(layer.title, {sticky:true})
        }

        if (Object.keys(feature.properties).length > 0) {
            const createPopup = () => {
                const popupHeader = layer.popupHeader || geojsonLayer.popupHeader
                const propertiesTable = createFeaturePropertiesTable(feature.properties, {
                        header: typeof popupHeader === 'function' ? (() => {
                            layer.on('popupopen', () => layer._popup._contentNode.querySelector('th').innerText = popupHeader())
                            return popupHeader()
                        })() : popupHeader
                })
                
                layer.bindPopup(propertiesTable.outerHTML, {
                    autoPan: false,
                }).openPopup()
                
                layer.off('click', createPopup)
            }

            layer.on('click', createPopup)
        }
    }

    options.geojson && geojsonLayer.addData(options.geojson)

    return geojsonLayer
}
