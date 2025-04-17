const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getLeafletStyleParams = ({
    iconType='bi',
    iconClass='circle-fill',
    iconSize=10,
    iconShadow=false,
    iconGlow=false,
    textWrap=false,
    boldText=false,
    
    fillColor=generateRandomColor(),
    fillOpacity=0.5,
    
    fillPattern='solid',
    fillAngle=0,
    fillPatternId='',

    strokeColor=true,
    strokeOpacity=1,
    strokeWidth=1,
    
    lineCap='round',
    lineJoin='round',
    lineBreak='solid',
    
    dashArray,
    dashOffset,
} = {}) => {
    const hslaColor = manageHSLAColor(fillColor)
    strokeColor = strokeColor === true ? hslaColor.toString({l:hslaColor.l/2}) : strokeColor || 'transparent'
    iconGlow = iconGlow === true ? hslaColor?.toString({a:fillOpacity}) : iconGlow || null

    if (!dashArray && lineBreak !== 'solid') {
        dashArray = `${
            lineBreak === 'dashed' 
            ? (strokeWidth * 5) 
            : (((Math.ceil(strokeWidth)) - 1) || 1)
        } ${strokeWidth * 3}`
    }

    return  {
        strokeWidth,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        iconClass,
        iconSize,
        iconShadow,
        iconGlow,
        dashArray,
        dashOffset,
        lineCap,
        lineJoin,
        iconType,
        textWrap,
        boldText,
        fillPattern,
        fillAngle,
        fillPatternId,
    }    
}

const getLeafletLayerStyle = (feature, styleParams={}) => {
    const type = feature?.geometry?.type?.toLowerCase().split('multi').filter(i => i !== '')[0]
    if (!type) return

    const {
        fillColor,
        fillOpacity,
        strokeColor,
        strokeOpacity,
        strokeWidth,
        iconClass,
        iconSize,
        iconShadow,
        iconGlow,
        lineCap,
        lineJoin,
        dashArray,
        dashOffset,
        iconType,
        textWrap,
        boldText,
        fillPattern,
        fillAngle,
        fillPatternId,
    } = getLeafletStyleParams(styleParams)
    
    const hslaColor = manageHSLAColor(fillColor)

    if (type === 'point') {
        const element = iconType === 'html' ? customCreateElement({innerHTML:iconClass}).firstChild : customCreateElement({
            innerHTML: iconType === 'text' ? iconClass : iconType === 'property' ? feature.properties[iconClass] ?? '' : '',
            className:removeWhitespace(`
                h-100 w-100 d-flex justify-content-center align-items-center
                ${iconType === 'bi' ? `bi bi-${iconClass}` : `
                    text-center
                    ${textWrap ? 'text-wrap' : 'text-nowrap'}
                    ${boldText ? 'fw-bold' : 'fw-normal'}
                `}
            `),
        })
        
        if (element instanceof Element) {
            if (Array('img', 'svg', 'path').includes(element.tagName)) {
                element.classList.add('position-absolute')
                element.setAttribute('width', iconSize)
                element.setAttribute('height', iconSize)
            } else {
                element.style.fontSize = `${iconSize}px`
                element.style.color = hslaColor?.toString({a:fillOpacity}) || fillColor
                element.style.WebkitTextStroke = `${strokeWidth}px ${manageHSLAColor(strokeColor)?.toString({a:strokeOpacity}) || strokeColor}`
                element.style.textShadow = Array(
                    iconShadow ? `2px 2px 4px ${hslaColor?.toString({l:hslaColor.l/10,a:fillOpacity}) || 'black'}` : '',
                    iconGlow ? `0 0 ${iconSize/2*1}px ${iconGlow}, 0 0 ${iconSize/2*2}px ${iconGlow}, 0 0 ${iconSize/2*3}px ${iconGlow}, 0 0 ${iconSize/2*4}px ${iconGlow}` : ''
                ).filter(style => style !== '').join(',')
            }
        }

        return L.divIcon({
            className: 'bg-transparent d-flex justify-content-center align-items-center',
            html: element?.outerHTML ?? '',
        });
    } else {
        const params = {
            color: strokeColor,
            weight: strokeWidth,
            opacity: strokeOpacity,
            lineCap,
            lineJoin,
            dashArray,
            dashOffset,    
        } 
        
        if (type === 'polygon') {
            params.fillOpacity = fillColor ? fillOpacity : 0
            params.fillColor = fillPattern === 'solid' ? fillColor : `url(#${fillPatternId})`
        }
        
        return params
    }
}

const getLeafletLayerBounds = async (layer) => {
    if (layer._library?.bbox) {
        const [w,s,n,e] = JSON.parse(layer._library.bbox)
        return L.latLangBounds([s,w],[n,e])
    }

    if (layer instanceof L.GeoJSON && layer._fetchParams?.geojson) {
        return L.geoJSON(layer._fetchParams?.geojson).getBounds()
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
    
    const bounds = await getLeafletLayerBounds(layer)
    zoomLeafletMapToBounds(map, bounds)
}

const leafletLayerStyleToHTML = (style, type) => {
    return type === 'point' ? style.options?.html : (() => {
        const width = 20
        const height = 14

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', width)
        svg.setAttribute('height', height)
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.display = 'block'
        
        const isPolygon = type === 'polygon'
        const symbol = document.createElementNS(
            'http://www.w3.org/2000/svg', 
            `${isPolygon ? 'rect' : 'line'}`
        )

        if (isPolygon) {
            symbol.setAttribute('x', 0)
            symbol.setAttribute('y', 0)
            symbol.setAttribute('width', width)
            symbol.setAttribute('height', height)
            symbol.setAttribute('fill-rule', 'evenodd')
            symbol.setAttribute('fill', style.fillColor)
            symbol.setAttribute('fill-opacity', style.fillOpacity)
        } else {
            symbol.setAttribute('x1', 0)
            symbol.setAttribute('y1', height/2)
            symbol.setAttribute('x2', width)
            symbol.setAttribute('y2', height/2)
        }

        symbol.setAttribute('stroke', style.color)
        symbol.setAttribute('stroke-opacity', style.opacity)
        symbol.setAttribute('stroke-width', style.weight)
        symbol.setAttribute('stroke-linecap', style.lineCap)
        symbol.setAttribute('stroke-linejoin', style.lineJoin)
        symbol.setAttribute('stroke-dasharray', style.dashArray)
        symbol.setAttribute('stroke-dashoffset', style.dashOffset)

        svg.appendChild(symbol)

        return svg.outerHTML
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

const cloneLeafletLayerStyles = (layer) => {
    const styles = structuredClone(layer._styles)
    const svgFillDefs = document.querySelector(`svg#svgFillDefs defs`)
    
    Array(styles.default, ...Object.values(styles.groups ?? {})).forEach(i => {
        const currentId = i.styleParams.fillPatternId
        if (!currentId) return 
        
        const pattern = svgFillDefs.querySelector(`#${currentId}`)
        if (!pattern) return

        const newId = generateRandomString()
        i.styleParams.fillPatternId = newId

        const clonedPattern = pattern.cloneNode(true)
        clonedPattern.id = newId
        svgFillDefs.appendChild(clonedPattern)

        console.log(clonedPattern)
    })

    return styles
}

const deleteLeafletLayerFillPatterns = (layer) => {
    const svgFillDefs = document.querySelector(`svg#svgFillDefs defs`)
                
    Array(layer._styles.default, ...Object.values(layer._styles.groups ?? {})).forEach(i => {
        const fillPatternId = i.styleParams.fillPatternId
        if (!fillPatternId) return 
        
        const pattern = svgFillDefs.querySelector(`#${fillPatternId}`)
        pattern.remove()
    })
}

const getLeafletLayerContextMenu = async (e, layer, {

} = {}) => {
    if (!layer) return 
    const type = getLeafletLayerType(layer)

    const feature = layer.feature
    const geojsonLayer = type === 'geojson' ? layer : feature ? findLeafletFeatureLayerParent(layer) : null

    const group = layer._group || geojsonLayer?._group
    if (!group) return
    
    const layerGeoJSON = await (async () => {
        if (!Array('feature', 'geojson').includes(type)) return
        
        try {
            return feature ? turf.featureCollection([feature]) : layer.toGeoJSON ? layer.toGeoJSON() : null
        } catch {
            try {
                if (layer instanceof L.GeoJSON) {
                    return turf.featureCollection(layer.getLayers()?.map(l => l.feature))
                }
            } catch {
                return layer._fetchParams?.geojson
            }
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
        zoomCurrent: !isLegendGroup || isLegendFeature || !geojsonLayer ? null : {
            innerText: `Zoom to current features`,
            btnCallback: async () => {
                if (layer.getLayers().length) zoomLeafletMapToBounds(map, layer.getBounds())
            }
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
        style: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Style ${typeLabel}`,
            btnCallback: async () => {
                const styleAccordionSelector = `#${mapContainer.id}-panels-accordion-style`
                mapContainer.querySelector(`[data-bs-target="${styleAccordionSelector}"]`).click()

                const styleAccordion = mapContainer.querySelector(styleAccordionSelector)
                const layerSelect = styleAccordion.querySelector(`select[name="layer"]`)
                layerSelect.focus()
                layerSelect.value = layer._leaflet_id
                layerSelect.dispatchEvent(new Event('change', {
                    bubbles: true,
                    cancelable: true,
                })) 
            }
        },
        copyStyle: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Copy layer style`,
            btnCallback: async () => {
                navigator.clipboard.writeText(JSON.stringify(geojsonLayer._styles))
            }
        },
        pasteStyle: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Paste layer style`,
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return

                try {
                    const styles = JSON.parse(text)
                    if (!Object.keys(geojsonLayer._styles).every(i => {
                        return Object.keys(styles).includes(i)
                    })) return

                    const clonedStyles = cloneLeafletLayerStyles({_styles:styles})
                    deleteLeafletLayerFillPatterns(geojsonLayer)
                    geojsonLayer._styles = clonedStyles
                    updateGeoJSONData(geojsonLayer)
                } catch { return }
            }
        },

        divider3: !isLegendGroup? null : {
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

        divider4: {
            divider: true,
        },
        legend: {
            innerText: isLegendGroup && !feature ? `Duplicate ${typeLabel}` : 'Add to legend',
            btnCallback: async () => {
                const targetGroup = isLegendGroup ? group : map._ch.getLayerGroups().client
                const pane = createCustomPane(map)

                const attribution = feature ? geojsonLayer._attribution : layer._attribution
                const title = layer._title || (feature ? (feature.geometry.type || 'feature') : 'layer')
                const fetchParams = feature ? geojsonLayer._fetchParams : layer._fetchParams
                const styles = isLegendGroup ? cloneLeafletLayerStyles((feature ? geojsonLayer : layer)) : null

                let newLayer
                if (['feature', 'geojson'].includes(type)) {
                    newLayer = await getLeafletGeoJSONLayer({
                        geojson: layerGeoJSON,
                        group: targetGroup,
                        pane,
                        title,
                        attribution,
                        fetchParams,
                        styles,
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
    let isVisible = true
    if (visibility.active) {
        const mapScale = getLeafletMeterScale(map)
        const layerMinScale = visibility.min || 0
        const layerMaxScale = visibility.max || 5000000
        isVisible = mapScale <= layerMaxScale && mapScale >= layerMinScale
    }

    if (addLayer) {
        isVisible ? group._ch.removeInvisibleLayer(layer) : group._ch.addInvisibleLayer(layer)
    }

    return isVisible
}