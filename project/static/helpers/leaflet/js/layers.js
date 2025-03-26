const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getLeafletStyleParams = ({
    color=generateRandomColor(),
    strokeWidth=1,
    strokePattern='solid',
    strokeColor=true,
    strokeOpacity=1,
    
    fillColor=true,
    fillOpacity=0.5,
    
    iconClass='bi bi-circle-fill',
    iconOpacity=1,
    iconShadow=false,
    iconGlow=false,
    iconSize=10,
    iconStroke=1,
} = {}) => {
    return  {
        color,
        strokeWidth,
        strokePattern,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        iconClass,
        iconSize,
        iconOpacity,
        iconShadow,
        iconGlow,
        iconStroke,
    }    
}

const getLeafletLayerStyle = (featureType, styleParams={}) => {
    const {
        color,
        strokeWidth,
        strokePattern,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        iconClass,
        iconSize,
        iconOpacity,
        iconShadow,
        iconGlow,
        iconStroke,

    } = getLeafletStyleParams(styleParams)
    if (!featureType) return
    const type = featureType.toLowerCase().split('multi')[featureType.toLowerCase().split('multi').length-1]
    const hslaColor = manageHSLAColor(color)
    const strokeColorVal = strokeColor === true ? hslaColor?.toString({l:hslaColor.l/2, a:(type === 'point' ? strokeOpacity: 1)}) || color : strokeColor || 'transparent'
    const fillColorVal = fillColor === true ? hslaColor?.toString({a:(type === 'point' ? iconOpacity: 1)}) || color : fillColor || 'transparent'

    if (type === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 d-flex justify-content-center align-items-center ${iconClass}`
        div.style.fontSize = `${iconSize}px`
        div.style.color = fillColorVal
        div.style.WebkitTextStroke = `${iconStroke}px ${strokeColorVal}`
        div.style.textShadow = Array(
            iconShadow ? `2px 2px 4px ${hslaColor?.toString({l:hslaColor.l/10}) || 'black'}` : '',
            iconGlow ? `0 0 5px ${color}, 0 0 10px ${color}, 0 0 15px ${color}, 0 0 20px ${color}` : ''
        ).filter(style => style !== '').join(',')

        return L.divIcon({
            className: 'bg-transparent',
            html: div.outerHTML,
        });
    } else {
        const params = {
            color: type === 'polygon' ? strokeColorVal : fillColorVal,
            weight: strokeWidth,
            opacity: strokeOpacity,
        } 
        
        if (type === 'polygon') {
            params.fillOpacity = fillColor ? fillOpacity : 0
            params.fillColor = fillColorVal
        }
        
        return params
    }
}

const zoomToLeafletLayer = (layer, map, {
    zoom = 18,
} = {}) => {
    if (typeof layer.getBounds === 'function') {
        const b = layer.getBounds()
        if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
            return map.setView(b.getNorthEast(), zoom)
        } else {
            return map.fitBounds(b)
        }
    }

    if (typeof layer.getLatLng === 'function') {
        return map.setView(layer.getLatLng(), zoom)
    }
}

const leafletLayerStyleToHTML = (style, type) => {
    return type === 'point' ? style.options?.html : (() => {
        const borderStyle = `${style.weight}px solid ${manageHSLAColor(style.color)?.toString({a:style.opacity}) || style.color}`
        
        const div = document.createElement('div')
        div.className = removeWhitespace(`
            ${type === 'linestring' ? 'h-0' : 'h-100'}
            w-100
        `)
        if (type === 'polygon') {
            div.style.backgroundColor = manageHSLAColor(style.fillColor)?.toString({a:style.fillOpacity}) || style.fillColor
            div.style.border = borderStyle
        } else {
            div.style.borderTop = borderStyle
        }

        return div.outerHTML
    })()
}

const validateLeafletLayerCoords = (coords, precision=6) => {
    const reference = {
        'lat' : {min:-90, max:90},
        'lng' : {min:-180, max:180},
    }

    Object.keys(coords).forEach(dir => {
        const min = reference[dir].min
        const max = reference[dir].max
        
        let value = coords[dir]
        if (value < min) {
            value = min
        } else if (value > max) {
            value = max
        } else {
            value = Number(value.toFixed(precision))
        }
        
        coords[dir] = value
    })
}

const getLeafletLayerType = (layer) => {
    if (layer.feature) return 'feature'
    if (layer instanceof L.GeoJSON) return 'geojson'
}

const getLeafletLayerContextMenu = (e, layer, {
    geojson = layer.toGeoJSON ? layer.toGeoJSON() : null,
} = {}) => {
    const group = layer._group
    if (!group) return

    if (geojson.type === 'feature') geojson = turf.featureCollection([geojson]) 

    const map = group._map
    const feature = layer.feature
    const isLegendGroup = map._legendLayerGroups.includes(group)
    const isLegendFeature = isLegendGroup && feature
    const checkbox = layer._checkbox
    const disabledCheckbox = checkbox && checkbox.disabled
    const checkboxArray = layer._checkboxContainer ? Array.from(
        layer._checkboxContainer?.querySelectorAll('input.form-check-input')
    ) : null
    const layerArray = isLegendGroup ? map.getLegendLayers() : group._customHandlers.getAllLayers()
    const noArrays = !checkboxArray && !layerArray

    const type = getLeafletLayerType(layer) 
    const typeLabel = type === 'feature' ? type : 'layer'
    
    const addLayer = (l) => {
        group._customHandlers.showLayer(l)
        if (l._eventParents) {
            Object.values(l._eventParents).forEach(p => {
                if (p._checkbox) {
                    p._checkbox.checked = true
                }
            })
        }
    }
    
    const removeLayer = (l, hidden=false) => {
        hidden ? group._customHandlers.hideLayer(l) : group.removeLayer(l)
        if (l._eventParents) {
            Object.values(l._eventParents).forEach(p => {
                if (p._checkbox) {
                    p._checkbox.checked = p.getLayers().some(f => group.hasLayer(f))
                }
            })
        }
    }

    return contextMenuHandler(e, {
        zoomin: {
            innerText: `Zoom to ${typeLabel}`,
            btnCallback: () => zoomToLeafletLayer(layer, map)
        },
        isolate: isLegendFeature || noArrays || disabledCheckbox ? null : {
            innerText: `Isolate ${typeLabel}`,
            btnCallback: () => {
                checkboxArray?.forEach(c => {
                    if (c.checked) c.click()
                })

                layerArray?.forEach(l => {
                    if (l._checkbox) {
                        const c = l._checkbox
                        if (c.checked) c.click()
                    } else {
                        removeLayer(l, isLegendGroup)
                    }
                })
                
                if (checkbox) {
                    checkbox.click()
                } else {
                    addLayer(layer)
                }
            }
        },
        visibility: isLegendFeature || disabledCheckbox ? null : {
            innerText: `Toggle ${typeLabel} visibility`,
            btnCallback: () => {
                if (checkbox) {
                    checkbox.click()
                } else {
                    if (group.hasLayer(layer)) {
                        removeLayer(layer, isLegendGroup)
                    } else {
                        addLayer(layer)
                    }
                }
            }
        },
        showProperties: !feature || !Object.keys(feature.properties).length ? null : {
            innerText: `Show properties`,
            btnCallback: () => {
                zoomToLeafletLayer(layer, map)
                if (checkbox) {
                    if (!checkbox.checked) checkbox.click()
                } else {
                    if (!group.hasLayer(layer)) addLayer(layer)
                }
                layer.fire('click')
            }
        },

        divider1: !feature ? null : {
            divider: true,
        },
        copyFeature: !feature ? null : {
            innerText: 'Copy feature',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature))
        },
        copyProperties: !feature ? null : {
            innerText: 'Copy properties',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature.properties))
        },
        copyGeometry: !feature ? null : {
            innerText: 'Copy geometry',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature.geometry))
        },
        
        divider2: {
            divider: true,
        },
        legend: {
            innerText: isLegendGroup && !feature ? `Duplicate ${typeLabel}` : 'Add to legend',
            btnCallback: () => {
                const targetGroup = isLegendGroup ? group : map.getLayerGroups().client
                const pane = createCustomPane(map)
                const attribution = createAttributionTable(geojson || {})?.outerHTML || layer._attribution
                
                let newLayer
                if (['feature', 'geojson'].includes(type)) {
                    newLayer = getLeafletGeoJSONLayer({
                        geojson: feature ? turf.featureCollection([feature]) : geojson,
                        title: layer._title,
                        attribution,
                        pane,
                        group: targetGroup,
                    })
                }

                if (newLayer) targetGroup.addLayer(newLayer)
            }
        }, //disabledCheckbox ? null : 
        download: !feature && type !== 'geojson' ? null : {
            innerText: 'Download GeoJSON',
            btnCallback: () => downloadGeoJSON(
                feature || geojson, 
                layer._title
            )
        },
        remove: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Remove ${typeLabel}`,
            btnCallback: () => {
                group._customHandlers.removeHiddenLayer(layer)
                group.removeLayer(layer)
            }
        },
    })
}