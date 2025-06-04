const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getLeafletStyleParams = ({
    iconType='bi',
    iconSpecs='circle-fill',
    iconSize=10,
    iconRotation=0,

    iconFill=true,
    iconStroke=true,

    iconShadow=false,
    iconGlow=false,
    textShadow=null,

    textWrap=false,
    boldFont=false,
    italicFont=false,
    fontSerif=false,
    
    fillColor=generateRandomColor(),
    patternBgColor,
    patternBg=true,
    fillOpacity=0.5,
    
    fillPattern='solid',
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
    fillColor = hslaColor.toString()
    
    strokeColor = strokeColor === true ? hslaColor.toString({l:hslaColor.l/2}) : strokeColor || 'transparent'
    if (!patternBgColor) patternBgColor = hslaColor.toString({h:(hslaColor.h + 180) % 360, l:hslaColor.l/2})

    return  {
        strokeWidth,
        strokeColor,
        strokeOpacity,
        fillColor,
        patternBgColor,
        patternBg,
        fillOpacity,
        iconSpecs,
        iconSize,
        iconShadow,
        iconGlow,
        dashArray,
        dashOffset,
        lineCap,
        lineJoin,
        iconType,
        textWrap,
        boldFont,
        fillPattern,
        iconRotation,
        fillPatternId,
        iconFill,
        iconStroke,
        italicFont,
        fontSerif,
        lineBreak,
        textShadow,
    }    
}

const getLeafletLayerStyle = (feature, styleParams={}, {
    renderer,
    allowCircleMarker=true,
} = {}) => {
    const type = feature?.geometry?.type?.toLowerCase().split('multi').filter(i => i !== '')[0]
    if (!type) return

    const {
        strokeWidth,
        strokeColor,
        strokeOpacity,
        fillColor,
        patternBgColor,
        patternBg,
        fillOpacity,
        iconSpecs,
        iconSize,
        iconShadow,
        iconGlow,
        dashArray,
        dashOffset,
        lineCap,
        lineJoin,
        iconType,
        textWrap,
        boldFont,
        fillPattern,
        iconRotation,
        fillPatternId,
        iconFill,
        iconStroke,
        italicFont,
        fontSerif,
        lineBreak,
        textShadow,
    } = getLeafletStyleParams(styleParams)
    const hslaColor = manageHSLAColor(fillColor)

    const isPoint = type === 'point'
    const isCanvas = renderer instanceof L.Canvas
    const isCircleMarker = (
        allowCircleMarker
        && isPoint 
        && iconType === 'bi' 
        && iconSpecs === 'circle-fill'
        && !iconShadow
        && !iconGlow
        && !boldFont
        && !italicFont
    )

    if (isPoint && !isCircleMarker) {
        let element

        const svg = document.querySelector(`svg#${fillPatternId}-svg`)
        if (!svg || iconType === 'html' || (textWrap && Array('text', 'property').includes(iconType))) {
            element = Array('html', 'svg').includes(iconType) 
            ? customCreateElement({innerHTML:iconSpecs}).firstChild 
            : iconType === 'img' ? customCreateElement({
                innerHTML:removeWhitespace(`<img src="${iconSpecs}" alt="icon">`)
            }).firstChild
            : customCreateElement({
                innerHTML: (
                    iconType === 'bi' ? `&#x${bootstrapIcons[iconSpecs] ?? 'F287'};` : 
                    Array('text', 'emoji').includes(iconType) ? iconSpecs : 
                    iconType === 'property' ? feature.properties[iconSpecs] ?? '' : 
                    ''
                ),
                style: {
                    fontSize: `${iconSize}px`,
                    fontFamily: (
                        iconType === 'bi' ? 'bootstrap-icons' : 
                        fontSerif ? 'Georgia, "Times New Roman", Times, serif' : 
                        'default'
                    ),
                    color: iconFill ? hslaColor?.toString({a:fillOpacity}) || fillColor : 'transparent',
                    ...(textWrap ? {maxWidth:`${iconSize}px`} : {})
                },
                className:removeWhitespace(`
                    h-100 w-100 d-flex justify-content-center align-items-center text-center lh-1
                    ${textWrap ? 'text-wrap' : 'text-nowrap'}
                    ${boldFont ? 'fw-bold' : 'fw-normal'}
                    ${italicFont ? 'fst-italic' : 'fst-normal'}
                `),
            })

            if (element instanceof Element) {
                if (Array('svg', 'img').includes(iconType) || Array('svg', 'img').includes(element.tagName.toLowerCase())) {
                    element.setAttribute('width', iconSize)
                    element.setAttribute('height', iconSize)

                    if (iconType === 'svg') {
                        element.setAttribute('fill', (() => {
                            if (iconFill) element.setAttribute('fill-opacity', fillOpacity)
                            return iconFill ? fillColor : 'none'
                        })())
                        element.setAttribute('stroke', (() => {
                            if (iconStroke) {
                                element.setAttribute('stroke-opacity', strokeOpacity)
                                element.setAttribute('stroke-width', strokeWidth)
                                element.setAttribute('stroke-linecap', lineCap)
                                element.setAttribute('stroke-linejoin', lineJoin)
                                element.setAttribute('stroke-dasharray', dashArray)
                                element.setAttribute('stroke-dashoffset', dashOffset)
                            }
                            return iconStroke ? strokeColor : 'none'
                        })())    
                    }
                }

                if (Array('emoji', 'img', 'html').includes(iconType)) {
                    element.style.opacity = fillOpacity
                }
                
                element.style.transform = `rotate(${iconRotation}deg)`
                element.style.transformOrigin = `50% 50%`
                element.style.WebkitTextStroke = iconStroke ? `${strokeWidth}px ${manageHSLAColor(strokeColor)?.toString({a:strokeOpacity}) || strokeColor}` : ''
                element.style.textShadow = textShadow
            }    
        } else {
            element = svg.cloneNode(true)
            element.removeAttribute('id')
        }

        return L.divIcon({
            className: 'bg-transparent d-flex justify-content-center align-items-center',
            html: element?.outerHTML ?? '',
        })
    } else {
        const hasStroke = !isPoint || iconStroke
        const params = {
            color: hasStroke ? strokeColor : 'transparent',
            weight: hasStroke ? strokeWidth: 0,
            opacity: hasStroke ? strokeOpacity : 0,
            lineCap,
            lineJoin,
            dashArray,
            dashOffset, 
            renderer, 
        }

        if (isPoint) {
            params.radius = iconSize/2
            params.fillColor = iconFill ? fillColor : 'none'
            params.fillOpacity = iconFill ? fillOpacity : 0
        }

        if (type === 'polygon') {
            params.fillOpacity = fillOpacity
            params.fillColor = fillPattern === 'solid' ? fillColor : (() => {
                const bgColor = patternBg ? patternBgColor : 'transparent'
                if (isCanvas) {
                    const imgId = `${fillPatternId}-img`
                    const img = document.querySelector(`#${imgId}`)
                    const validImg = (
                        img
                        && img instanceof Element 
                        && img.tagName.toLowerCase() === 'img'
                        && img.getAttribute('src')
                    )
                    if (validImg) {
                        params.imgId = imgId
                        params.stroke = strokeColor && strokeOpacity > 0 ? true : false
                        params.fill = fillColor && fillOpacity > 0 ? true : false
                    }
                } else {
                    const pattern = document.querySelector(`#${fillPatternId}-pattern`)
                    if (pattern) return `url(#${fillPatternId}-pattern)`
                }
                return bgColor 
            })()
        }

        return params
    }
}

const getLeafletLayerBounds = async (layer) => {
    if (layer._library?.bbox) {
        const [w,s,n,e] = JSON.parse(layer._library.bbox)
        return L.latLangBounds([s,w],[n,e])
    }

    const dbIndexedKey = layer._dbIndexedKey
    if (layer instanceof L.GeoJSON && dbIndexedKey) {
        const geojson = (await getFromGeoJSONDB(dbIndexedKey))?.geojson
        if (geojson) return L.geoJSON(geojson).getBounds()
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
    return style.options?.html.replace('position-absolute','') ?? (() => {
        const isPoint = type === 'point'
        const isLineString = type === 'linestring'
        const isPolkygon = type === 'polygon'
        
        const iconSize = (style.radius*2) + (style.opacity ? style.weight*2 : 0)
        const width = isPoint ? iconSize : 20
        const height = isPoint ? iconSize : 14

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', width)
        svg.setAttribute('height', height)
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.display = 'block'
        
        const symbol = document.createElementNS(
            'http://www.w3.org/2000/svg', 
            `${isPoint ? 'circle' : isLineString ? 'line' : 'rect'}`
        )

        symbol.setAttribute('stroke', style.color)
        symbol.setAttribute('stroke-opacity', style.opacity)
        symbol.setAttribute('stroke-width', style.weight)
        symbol.setAttribute('stroke-linecap', style.lineCap)
        symbol.setAttribute('stroke-linejoin', style.lineJoin)
        symbol.setAttribute('stroke-dasharray', style.dashArray)
        symbol.setAttribute('stroke-dashoffset', style.dashOffset)

        if (isLineString) {
            symbol.setAttribute('x1', 0)
            symbol.setAttribute('y1', height/2)
            symbol.setAttribute('x2', width)
            symbol.setAttribute('y2', height/2)
        } else {
            if (isPoint) {
                symbol.setAttribute('r', style.radius)
                symbol.setAttribute('cx', width/2)
                symbol.setAttribute('cy', height/2)
            } else {
                symbol.setAttribute('x', 0)
                symbol.setAttribute('y', 0)
                symbol.setAttribute('width', width)
                symbol.setAttribute('height', height)
            }

            symbol.setAttribute('fill', style.fillColor)
            symbol.setAttribute('fill-opacity', style.fillOpacity)
            symbol.setAttribute('fill-rule', 'evenodd')
        }

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

const cloneFillPatternDefs = (currentId) => {
    if (!currentId) return 
        
    const defs = document.querySelector(`svg#svgFillDefs defs#${currentId}`)
    if (!defs) return

    const newId = generateRandomString()

    const clonedDefs = defs.cloneNode(true)
    clonedDefs.id = newId
    svgFillDefs.appendChild(clonedDefs)
    
    Array.from(clonedDefs.children).forEach(e => {
        e.id = `${newId}-${e.id.replace(`${currentId}-`,'')}`
    })

    Array.from(clonedDefs.querySelectorAll('use')).forEach(e => {
        e.setAttribute('href', `#${newId}-${e.getAttribute('href').replace(`#${currentId}-`,'')}`)
    })

    return clonedDefs
}

const cloneLeafletLayerStyles = (layer) => {
    const styles = structuredClone(layer._styles)
    const symbology = styles.symbology
    
    Array(symbology.default, ...Object.values(symbology.groups ?? {})).forEach(i => {
        const newDefs = cloneFillPatternDefs(i.styleParams.fillPatternId)
        i.styleParams.fillPatternId = newDefs?.id ?? null
    })

    return styles
}

const deleteLeafletLayerFillPatterns = (layer) => {
    const svgFillDefs = document.querySelector(`svg#svgFillDefs`)
    const symbology = layer._styles.symbology
    Array(symbology.default, ...Object.values(symbology.groups ?? {})).forEach(i => {
        const fillPatternId = i.styleParams.fillPatternId
        if (!fillPatternId) return 
        
        const defs = svgFillDefs.querySelector(`#${fillPatternId}`)
        defs?.remove()
    })
}

const getLeafletLayerContextMenu = async (e, layer, {

} = {}) => {
    if (!layer) return 
    const type = getLeafletLayerType(layer)

    const feature = layer.feature
    const geojsonLayer = type === 'geojson' ? layer : feature ? findLeafletFeatureLayerParent(layer) : null
    const featureInfo = geojsonLayer?._styles.info

    const group = layer._group || geojsonLayer?._group
    if (!group) return
    
    const layerGeoJSON = await (async () => {
        if (!Array('feature', 'geojson').includes(type)) return
        
        try {
            return feature ? turf.featureCollection([feature]) : layer.toGeoJSON ? layer.toGeoJSON() : null
        } catch {
            try {
                if (type === 'geojson') {
                    return turf.featureCollection(layer.getLayers()?.map(l => l.feature))
                }
            } catch {
                return (await getFromGeoJSONDB(dbKey))?.geojson
            }
        }
    })()
    
    const map = group._map
    const mapContainer = map.getContainer()
    const isLegendGroup = map._legendLayerGroups.includes(group)
    const isLegendFeature = isLegendGroup && feature
    
    const checkbox = layer._checkbox
    const disabledCheckbox = checkbox?.disabled
    const checkboxContainer = checkbox ? geojsonLayer._checkbox.parentElement.parentElement.parentElement : null
    
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
            innerText: `Zoom to visible`,
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
        visibility: feature || checkbox ? null : {
            innerText: `Toggle visibility`,
            btnCallback: () => {
                group._ch.hasHiddenLayer(layer) 
                ? addLayer(layer)
                : removeLayer(layer, isLegendGroup) 
            }
        },
        propertiesTable: (
            !feature 
            || !featureInfo.popup.active 
            || !Object.keys(feature.properties).length
        ) ? null : {
            innerText: `Show properties table`,
            btnCallback: async () => {
                await zoomToLeafletLayer(layer, map)
                if (!group.hasLayer(layer)) addLayer(layer)
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
        
        divider3: !isLegendGroup || !geojsonLayer ? null : {
            divider: true,
        },
        copyDataSource: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Copy data source`,
            btnCallback: async () => {
                navigator.clipboard.writeText(JSON.stringify({dbIndexedKey:geojsonLayer._dbIndexedKey}))
            }
        },
        pasteDataSource: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Paste data source`,
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return

                try {
                    const dbIndexedKey = JSON.parse(text)?.dbIndexedKey
                    if (!dbIndexedKey) return

                    geojsonLayer._dbIndexedKey = dbIndexedKey
                    updateLeafletGeoJSONLayer(geojsonLayer)
                } catch { return }
            }
        },
        updateData: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Paste clipboard data`,
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return

                try {
                    const geojson = JSON.parse(text)
                    if (!geojson || geojson.type !== 'FeatureCollection' || !geojson.features?.length) return

                    await normalizeGeoJSON(geojson)
                    geojsonLayer._dbIndexedKey = saveToGeoJSONDB(turf.clone(geojson))
                    updateLeafletGeoJSONLayer(geojsonLayer, {geojson})
                } catch { return }
            }
        },
        clearData: !isLegendGroup || !geojsonLayer ? null : {
            innerText: `Clear cached data`,
            btnCallback: async () => {
                deleteFromGeoJSONDB(geojsonLayer._dbIndexedKey)
            }
        },

        divider5: {
            divider: true,
        },
        style: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Layer properties`,
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
        legend: {
            innerText: isLegendGroup && !feature ? `Duplicate ${typeLabel}` : 'Add to legend',
            btnCallback: async () => {
                const targetGroup = isLegendGroup ? group : map._ch.getLayerGroups().client
                const pane = createCustomPane(map)

                const attribution = feature ? geojsonLayer._attribution : layer._attribution
                const title = layer._title || (feature ? (feature.geometry.type || 'feature') : 'layer')
                const dbIndexedKey = (await getFromGeoJSONDB(layer._dbIndexedKey ?? '')) ? layer._dbIndexedKey : null
                const styles = isLegendGroup ? cloneLeafletLayerStyles((feature ? geojsonLayer : layer)) : null

                let addLayers
                if (['feature', 'geojson'].includes(type)) {
                    addLayers = await getLeafletGeoJSONLayer({
                        geojson: layerGeoJSON,
                        group: targetGroup,
                        pane,
                        title,
                        attribution,
                        dbIndexedKey,
                        styles,
                    })

                    if (type === 'geojson' && group._name === 'query') layer._dbIndexedKey = addLayers._dbIndexedKey
                }

                if (addLayers) targetGroup.addLayer(addLayers)
            }
        },
        download: !layerGeoJSON ? null : {
            innerText: 'Download data',
            btnCallback: () => {
                if (layerGeoJSON) downloadGeoJSON(layerGeoJSON, layer._title)
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
    })
}

const leafletLayerIsVisible = (layer, {addLayer=true}={}) => {
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

const urlToLeafletLayer = async ({
    group,
    add=false,
    params={},
}) => {
    if (!group) return

    const format = params.format
    const dbIndexedKey = Array(format, JSON.stringify({params})).join(';')

    const fileName = params.name.split('.')
    params.type = format === 'file' ? fileName[fileName.length-1] : (params.type ?? format)

    const layer = await createLeafletLayer(params, {dbIndexedKey, group, add})
    
    return layer
}

const createLeafletLayer = async (params, {
    dbIndexedKey,
    data,
    group,
    add,
} = {}) => {
    const map = group._map
    const pane = createCustomPane(map)

    let layer

    if (Array('geojson', 'csv').includes(type.toLowerCase())) {
        layer = await getLeafletGeoJSONLayer({
            geojson: data,
            group,
            pane,
            title: params.title,
            attribution: params.attribution,
            dbIndexedKey,
        })
    } else {
        if (type === 'xyz') {
            layer = L.tileLayer(url, {
                pane,
            })
        }

        if (type === 'wms') {
            const options = {
                layers: params.name,
                format: 'image/png',
                transparent: true,
                pane,
            }

            const styles = JSON.parse(params.styles ?? '{}')
            if (Object.keys(styles).length) {
                const name = Object.keys(styles)[0]
                options.styles = name
                params.title = styles[name].title
                params.legend = styles[name].legend
            }

            layer = L.tileLayer.wms(params.url, options)
        }

        if (layer) {
            layer._dbIndexedKey = dbIndexedKey
            layer._group = group
            layer._title = params.title
            layer._legend = params.legend
            layer._styles = {
                visibility: {
                    active: false,
                    min: 10,
                    max: 5000000,
                },
            }
            
            const attribution = (params.attribution ?? '').trim()
            if (attribution && !Array('None', '').includes(attribution)) {
                layer._attribution = attribution
            }
            
            const bbox = params.bbox ?? '[-180, -90, 180, 90]'
            if (!layer.getBounds) {
                const [w,s,e,n,crs] = JSON.parse(bbox)
                layer.getBounds = () => L.latLngBounds([[s, w], [n, e]])
            }
            
            return layer
        }
    }

    if (layer && add) {
        try {
            group.addLayer(layer)
        } catch (error) {
            group.removeLayer(layer)
            alert('Invalid layer.')
        }
    }

    return layer
}

const fileToLeafletLayer = async ({
    file,
    group, 
    add=false,
    filesArray=[],
    params={}
} ={}) => {
    if (!file || !group) return
    
    const fileName = file.name.split('.')
    params.title = params.title ?? (() => {
        const title = fileName.slice(0, -1).join('.').split('/')
        return title[title.length-1]
    })
    params.type = params.type ?? fileName[fileName.length-1]
    
    const rawData = await getFileRawData(file)
    if (!rawData) return

    const data = rawDataToLayerData(rawData, params)
    if (!data) return

    const layer = await createLeafletLayer(params, {data, group, add})
    
    return layer
}