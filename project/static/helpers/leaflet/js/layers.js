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
    radius=10,
    iconShadow=false,
    iconGlow=false,
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
        radius,
        iconShadow,
        iconGlow,
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
        radius,
        iconShadow,
        iconGlow,

    } = getLeafletStyleParams(styleParams)
    if (!featureType) return
    const type = featureType.toLowerCase().split('multi')[featureType.toLowerCase().split('multi').length-1]
    const hslaColor = manageHSLAColor(color)
    const strokeColorVal = strokeColor === true ? hslaColor?.toString({l:hslaColor.l/2, a:(type === 'point' ? strokeOpacity: 1)}) || color : strokeColor || 'transparent'
    const fillColorVal = fillColor === true ? hslaColor?.toString({a:(type === 'point' ? fillOpacity : 1)}) || color : fillColor || 'transparent'

    if (type === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 d-flex justify-content-center align-items-center ${iconClass}`
        div.style.fontSize = `${radius}px`
        div.style.color = fillColorVal
        div.style.WebkitTextStroke = `${strokeWidth}px ${strokeColorVal}`
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

const getLeafletLayerBounds = async (layer) => {
    if (layer._library?.bbox) {
        const [w,s,n,e] = JSON.parse(layer._library.bbox)
        return L.latLangBounds([s,w],[n,e])
    }

    if (layer instanceof L.GeoJSON && layer._fetcher) {
        const geojson = await layer._fetcher()
        return L.geoJSON(geojson).getBounds()
    }

    if (layer.getBounds) {
        return layer.getBounds()
    }
}

const zoomToLeafletLayer = async (layer, map, {
    zoom = 18,
} = {}) => {
    if (layer.getLatLng) {
        return map.setView(layer.getLatLng(), zoom)
    }
    
    const b = await getLeafletLayerBounds(layer)
    if (!b) return
    
    if (b.getNorth() === b.getSouth() && b.getEast() === b.getWest()) {
        return map.setView(b.getNorthEast(), zoom)
    } else {
        return map.fitBounds(b)
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

const findLeafletFeatureLayerParent = (layer) => {
    if (!layer.feature || !layer._eventParents) return

    for (const p of Object.values(layer._eventParents)) {
        if (p instanceof L.GeoJSON) return p
    }
}

const getLeafletLayerContextMenu = (e, layer, {

} = {}) => {
    if (!layer) return 
    const type = getLeafletLayerType(layer)

    const feature = layer.feature
    const geojsonLayer = type === 'geojson' ? layer : feature ? findLeafletFeatureLayerParent(layer) : null

    const group = layer._group || geojsonLayer?._group
    if (!group) return
    
    const layerGeoJSON = (() => {
        try {
            return feature ? turf.featureCollection([feature]) : layer.toGeoJSON ? layer.toGeoJSON() : null
        } catch {
            if (layer._fetcher?.name === 'defaultFetcher') return layer._fetcher()
        }
    })()
    
    const map = group._map
    const mapContainer = map.getContainer()
    const isLegendGroup = map._legendLayerGroups.includes(group)
    const isLegendFeature = isLegendGroup && feature
    
    const checkbox = layer._checkbox
    const disabledCheckbox = checkbox?.disabled
    const checkboxContainer = checkbox?.closest('.geojson-checklist')
    
    const checkboxArray = checkboxContainer ? Array.from(
        checkboxContainer?.querySelectorAll('input.form-check-input')
    ) : null
    const layerArray = isLegendGroup ? map._ch.getLegendLayers() : group._ch.getAllLayers()
    const noArrays = !checkboxArray && !layerArray
    
    const typeLabel = type === 'feature' ? type : 'layer'
    
    const addLayer = (l) => group._ch.removeHiddenLayer(l)
    const removeLayer = (l, hidden=false) => hidden ? group._ch.addHiddenLayer(l) : group.removeLayer(l)
    
    return contextMenuHandler(e, {
        zoomin: {
            innerText: `Zoom to ${typeLabel}`,
            btnCallback: async () => await zoomToLeafletLayer(layer, map)
        },
        isolate: isLegendFeature || noArrays || disabledCheckbox || geojsonLayer?._checkbox?.disabled ? null : {
            innerText: `Isolate ${typeLabel}`,
            btnCallback: () => {
                checkboxArray?.forEach(c => {
                    if (c.checked) c.click()
                })

                layerArray?.forEach(l => removeLayer(l, isLegendGroup))
                
                addLayer(layer)
            }
        },
        visibility: isLegendFeature || disabledCheckbox ? null : {
            innerText: `Toggle visibility`,
            btnCallback: () => {
                group._ch.hasHiddenLayer(layer) 
                ? addLayer(layer)
                : removeLayer(layer, isLegendGroup) 
            }
        },
        propertiesTable: !feature || !Object.keys(feature.properties).length ? null : {
            innerText: `Show properties table`,
            btnCallback: async () => {
                await zoomToLeafletLayer(layer, map)
                if (!group.hasLayer(layer)) addLayer(layer)
                layer.fire('click')
            }
        },
        style: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Style ${typeLabel}`,
            btnCallback: async () => {
                const styleAccordionSelector = `#${mapContainer.id}-panels-accordion-style`
                mapContainer.querySelector(`[data-bs-target="${styleAccordionSelector}"]`).click()

                const styleAccordion = mapContainer.querySelector(styleAccordionSelector)
                const layerSelect = styleAccordion.querySelector(`select[name="layer"]`)
                layerSelect.focus()
                layerSelect.value = layer._leaflet_id
                layerSelect.blur()
            }
        },

        // refreshData: !isLegendGroup || isLegendFeature ? null : {
        //     innerText: `Refresh ${typeLabel}`,
        //     btnCallback: async () => {
                
        //     }
        // },

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
        
        divider2: !isLegendGroup? null : {
            divider: true,
        },
        toggleLegend: !isLegendGroup? null : {
            innerText: `Toggle legend`,
            btnCallback: () => {
                const mapContainer = map.getContainer()
                const layers = mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers`)
                layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)?.classList.toggle('d-none')

                layers.classList.toggle(
                    'd-none', 
                    Array.from(layers.children)
                    .every(el => el.classList.contains('d-none'))
                )
            }
        },
        toggleAttribution: !isLegendGroup? null : {
            innerText: `Toggle attribution`,
            btnCallback: () => {
                const mapContainer = map.getContainer()
                const mapId = mapContainer.id
                mapContainer.querySelector(
                    `#${mapId}-panels-legend-layers-${layer._leaflet_id}-attribution`
                )?.classList.toggle('d-none')
            }
        },
        remove: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Remove ${typeLabel}`,
            keepMenuOn: true,
            btnCallback: (e) => {
                const parentElement = e.target.parentElement
                parentElement.innerHTML = ''
                
                const btn = document.createElement('button')
                btn.className = 'dropdown-item bg-danger border-0 btn btn-sm fs-12'
                btn.addEventListener('click', () => group._ch.clearLayer(layer))
                parentElement.appendChild(btn)
                
                const label = createSpan(
                    'Confirm to remove layer', 
                    {className:'pe-none text-wrap'}
                )
                btn.appendChild(label)
            }
        },

        divider3: {
            divider: true,
        },
        legend: {
            innerText: isLegendGroup && !feature ? `Duplicate ${typeLabel}` : 'Add to legend',
            btnCallback: async () => {
                const targetGroup = isLegendGroup ? group : map._ch.getLayerGroups().client
                const pane = createCustomPane(map)

                const geojsonLayer = findLeafletFeatureLayerParent(layer)
                const attribution = feature ? geojsonLayer._attribution : layer._attribution
                const styles = feature ? geojsonLayer._styles : layer._styles
                
                let newLayer
                if (['feature', 'geojson'].includes(type)) {
                    newLayer = await getLeafletGeoJSONLayer({
                        geojson: layerGeoJSON,
                        title: layer._title,
                        attribution,
                        pane,
                        group: targetGroup,
                        fetcher: layer._fetcher,
                        styles: isLegendGroup ? structuredClone(styles) : null
                    })
                }
                if (newLayer) targetGroup.addLayer(newLayer)
            }
        },
        download: !layerGeoJSON ? null : {
            innerText: 'Download GeoJSON',
            btnCallback: () => {
                if (layerGeoJSON) downloadGeoJSON(layerGeoJSON, layer._title)
            }
        },
    })
}

const layerIsVisible = (layer, {addLayer=true}={}) => {
    if (!layer) return

    const group = layer._group
    const map = group._map
    if (!map || !group) return

    const visibility = layer._styles.visibility
    if (!visibility) return true

    const mapScale = getLeafletMeterScale(map) || leafletZoomToMeter(map.getZoom())
    const layerMinScale = visibility.min || 0
    const layerMaxScale = visibility.max || 5000000
    const isVisible = mapScale <= layerMaxScale && mapScale >= layerMinScale

    if (addLayer) {
        isVisible ? group._ch.removeInvisibleLayer(layer) : group._ch.addInvisibleLayer(layer)
    }

    return isVisible
}