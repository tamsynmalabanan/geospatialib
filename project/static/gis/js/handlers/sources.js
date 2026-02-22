class SourcesHandler {
    constructor(map) {
        this.map = map
        this.map.sourcesHandler = this

        this.config = {
            systemOverlays: [
                'placeSearch',
                'infoFeature', 
                'tooltipFeature', 
                'searchResultBounds',
            ],
            baseLayers: [
                'basemap',
                'hillshade', 
            ],
        }
    }

    isSystemLayer({layer, id}={}) {
        if (!id && layer) {
            id = layer.id
        }

        return this.getSystemLayers().find(i => id.startsWith(i)) 
    }

    getSystemLayers() {
        return Array('systemOverlays', 'baseLayers').flatMap(i => this.config[i])
    }
    
    removeSourceLayers(sourceId) {
        const source = this.map.getSource(sourceId)
        if (!source) return

        this.map.getStyle().layers?.forEach(l => {
            if (l.source !== sourceId) return
            this.map.removeLayer(l.id)
        })
    }

    getLayersByName(layerName) {
        return this.map.getStyle().layers.filter(l => l.id.startsWith(layerName))
    }

    getGeoJSONSource(sourceId, {properties={}}={}) {
        const map = this.map

        let source = map.getSource(sourceId)

        if (!source) {
            map.addSource(sourceId, {
                type: "geojson",
                data: turf.featureCollection([])
            })
            source = map.getSource(sourceId)
            
            if (properties.metadata?.params?.type === 'wfs') {
                properties.metadata.params.get = Object.fromEntries(
                    Object.entries(properties.metadata?.params?.get ?? {})
                    .map(([k,v]) => [k.toLowerCase(), v])
                )
            }

            Object.entries(properties).forEach(([k,v]) => source[k] = v)
        }
        
        return source
    }

    getBeforeId(layerName, beforeId) {
        const layerIds = this.map.getStyle().layers.map(l => l.id)

        if (layerName === 'basemap') {
            return layerIds[0]
        }

        if (layerName === 'hillshade') {
            return layerIds.find(id => id !== 'basemap')
        }

        let systemOverlays = structuredClone(this.config.systemOverlays)
        const layerMatch = systemOverlays.find(i => layerName.startsWith(i))
        if (layerMatch) systemOverlays = systemOverlays.splice(systemOverlays.indexOf(layerMatch) + 1)

        return layerIds.find(id => id.startsWith(beforeId) || systemOverlays.find(i => id.startsWith(i)))
    }

    moveLayer(layerName, {
        beforeId,
    }={}) {
        const layers = this.map.getStyle().layers
        beforeId = this.getBeforeId(layerName, beforeId)

        layers.forEach(l => {
            if (!l.id.startsWith(layerName)) return
            this.map.moveLayer(l.id, beforeId)
        })
    }

    getGeoJSONLayerParams({
        filter,
        color=getRandomColor(),
        minzoom=0,
        maxzoom=24,
        visibility='visible',
        customParams,
    }={}) {
        const validFilter = [filter].filter(i => i)
        const filters = Object.fromEntries(Array(
            'Polygon', 'LineString', 'Point'
        ).map(i => [i, ["all", ["==", "$type", i], ...validFilter]]))
        
        const hsla = hslaColor(color)
        const outlineColor = hsla.toString({l:hsla.l*0.5})

        const metadata = {
            tooltip: {
                active: true,
            },
            popup: {
                active: true,
            },
        }

        const defaultParams = {
            'background': {
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                },
                paint: {
                    'background-color': getPreferredTheme() === 'light'? 'white' : 'black',
                    'background-opacity': 0.25,
                    // 'background-pattern': ''
                },
                metadata,
            },
            'fill': {
                minzoom,
                maxzoom,
                filter: filters.Polygon,
                layout: {
                    'fill-sort-key': 0,
                    visibility,
                },
                paint: {
                    'fill-antialias': true,
                    'fill-opacity': 0.5,
                    'fill-color': color,
                    'fill-outline-color': outlineColor,
                    'fill-translate': [0,0],
                    'fill-translate-anchor': 'map',
                    // 'fill-pattern': '',
                },
                metadata,
            },
            'line': {
                minzoom,
                maxzoom,
                filter: filters.LineString,
                layout: {
                    'line-cap': 'butt',
                    'line-join': 'miter',
                    'line-miter-limit': 2,
                    'line-round-limit': 1.05,
                    'line-sort-key': 0,
                    visibility,
                },
                paint: {
                    'line-opacity': 1,
                    'line-color': color,
                    'line-translate': [0,0],
                    'line-translate-anchor': 'map',
                    'line-width': 3,
                    'line-gap-width': 0,
                    'line-offset': 0,
                    'line-blur': 0,
                    // 'line-dasharray': [],
                    // 'line-pattern': '',
                    // 'line-gradient': '',
                },
                metadata,
            },
            'circle': {
                minzoom,
                maxzoom,
                filter: filters.Point,
                layout: {
                    'circle-sort-key': 0,
                    visibility,
                },
                paint: {
                    "circle-radius": 6, 
                    "circle-color": color,
                    "circle-blur": 0,
                    "circle-opacity": 1,
                    "circle-translate": [0,0],
                    "circle-translate-anchor": 'map',
                    "circle-pitch-scale": 'map',
                    "circle-pitch-alignment": 'viewport',
                    "circle-stroke-width": 1,
                    "circle-stroke-color": outlineColor,
                    "circle-stroke-opacity": 1,
                },
                metadata,
            },
            'heatmap': {
                minzoom,
                maxzoom,
                filter: filters.Point,
                layout: {
                    visibility,
                },
                paint: {
                    'heatmap-radius': 30,
                    'heatmap-weight': 1,
                    'heatmap-intensity': 1,
                    'heatmap-color': [
                        "interpolate",
                        ["linear"],
                        ["heatmap-density"],
                        0,"rgba(0, 0, 255, 0)",
                        0.1,"royalblue",
                        0.3,"cyan",
                        0.5,"lime",
                        0.7,"yellow",
                        1,"red"
                    ],
                    'heatmap-opacity': 0.5,
                },
                metadata,
            },
            'fill-extrusion': {
                minzoom,
                maxzoom,
                filter: filters.Polygon,
                layout: {
                    visibility,
                },
                paint: {
                    'fill-extrusion-opacity': 1,
                    'fill-extrusion-color': color,
                    'fill-extrusion-translate': [0,0],
                    'fill-extrusion-translate-anchor': 'map',
                    // 'fill-extrusion-pattern': '',
                    'fill-extrusion-height': 10,
                    'fill-extrusion-base': 0,
                    'fill-extrusion-vertical-gradient': true,
                },
                metadata,
            },
            'symbol': {
                minzoom,
                maxzoom,
                filter: filters.Point,
                layout: {
                    'symbol-placement': 'point',
                    'symbol-spacing': 250,
                    'symbol-avoid-edges': false,
                    'symbol-sort-key': 0,
                    'symbol-z-order': 'auto',
                    'icon-allow-overlap': false,
                    // 'icon-overlap': 'cooperative',
                    // 'icon-ignore-placement': false,
                    // 'icon-optional': false,
                    // 'icon-rotation-alignment': 'auto',
                    // 'icon-size': 1,
                    // 'icon-text-fit': 'width',
                    // 'icon-text-fit-padding': [0,0,0,0],
                    // 'icon-image': '',
                    // 'icon-rotate': 0,
                    // 'icon-padding': [2],
                    // 'icon-keep-upright': false,
                    // 'icon-offset': [0,0],
                    // 'icon-anchor': 'center',
                    // 'icon-pitch-alignment': 'auto',
                    // 'text-pitch-alignment': 'auto',
                    // 'text-rotation-alignment': 'auto',
                    'text-field': 'test', 
                    'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                    'text-size': 12,
                    // 'text-max-width': 10,
                    // 'text-line-height': 1.2,
                    // 'text-letter-spacing': 0,
                    // 'text-justify': 'center',
                    // 'text-radial-offset': 0,
                    // 'text-variable-anchor': [],
                    // 'text-variable-anchor-offset': [],
                    // 'text-anchor': 'center',
                    // 'text-max-angle': 45,
                    // 'text-writing-mode': [],
                    // 'text-rotate': 0,
                    // 'text-padding': 2,
                    // 'text-keep-upright': true,
                    // 'text-transform': 'none',
                    // 'text-offset': [0,0],
                    // 'text-allow-overlap': false,
                    // 'text-overlap': 'cooperative',
                    // 'text-ignore-placement': false,
                    // 'text-optional': false,
                    visibility,
                },
                paint: {
                    // 'icon-opacity': 0,
                    'icon-color': color,
                    // 'icon-halo-color': color,
                    // 'icon-halo-width': 0,
                    // 'icon-halo-blur': 0,
                    // 'icon-translate': [0,0],
                    // 'icon-translate-anchor': 'map',
                    // 'text-opacity': 1,
                    'text-color': color,
                    // 'text-halo-color': color,
                    // 'text-halo-width': 0,
                    // 'text-halo-blur': 0,
                    // 'text-translate': [0,0],
                    // 'text-translate-anchor': 'map',
                },
                metadata,
            }
        }

        const params = {
            // background
            'background': {
                'background': { 
                    render: false,
                    params: defaultParams.background,
                }, 
            },

            // 2D polygons
            'fill': {
                'polygon-shadows': {
                    render: false,
                    params: {
                        ...defaultParams.fill,
                        paint: {
                            ...defaultParams.fill.paint,
                            'fill-color': 'black',
                            'fill-translate': [-2.5,2.5],
                        }
                    },
                },
                'polygons': {
                    render: true,
                    params: defaultParams.fill,
                },
            },
            
            // lines
            'line': {
                'polygon-outlines': {
                    render: true,
                    params: {
                        ...defaultParams.line,
                        filter: filters.Polygon,
                        paint: {
                            ...defaultParams.line.paint,
                            'line-opacity': 1,
                            'line-color': outlineColor,
                            'line-width': 2,
                        }
                    },
                },
                'line-shadows': {
                    render: false,
                    params: {
                        ...defaultParams.line,
                        paint: {
                            ...defaultParams.line.paint,
                            'line-opacity': 0.5,
                            'line-color': 'black',
                            'line-translate': [-2.5,2.5],
                        }
                    },
                },
                'lines': {
                    render: true,
                    params: defaultParams.line,
                },
            },
            
            // points
            'circle': {
                'point-shadows': {
                    render: false,
                    params: {
                        ...defaultParams.circle,
                        paint: {
                            ...defaultParams.circle.paint,
                            "circle-color": 'white',
                            "circle-opacity": 0.5,
                            "circle-translate": [-2.5,2.5],
                        },
                    },
                },
                'points-outline': {
                    render: false,
                    params: {
                        ...defaultParams.circle,
                        paint: {
                            ...defaultParams.circle.paint,
                            "circle-color": 'transparent',
                            'circle-stroke-color': outlineColor,
                            'circle-stroke-width': 2, 
                            'circle-radius': 7, 

                        },
                    },
                },
                'points': {
                    render: true,
                    params: defaultParams.circle,
                },
            }, 
            'heatmap': {
                'points': {
                    render: false,
                    params: defaultParams.heatmap,
                },
            },

            // 3D polygons
            'fill-extrusion': {
                'polygon-shadows': {
                    render: false,
                    params: {
                        ...defaultParams['fill-extrusion'],
                        paint: {
                            'fill-extrusion-color':'black',
                            'fill-extrusion-translate': [-2.5,2.5],
                        },
                    },
                },
                'polygons': {
                    render: false,
                    params: defaultParams['fill-extrusion'],
                },
            },
            
            // points and lines
            'symbol': {
                'line-shadows': {
                    render: false,
                    params: {
                        ...defaultParams.symbol,
                        filter: filters.LineString,
                        layout: {
                            ...defaultParams.symbol.layout,
                            'symbol-placement': 'line',
                        },
                        paint: {
                            ...defaultParams.symbol.paint,
                            'icon-color': 'black',
                            'text-color': 'black',
                        }
                    },
                },
                'lines': {
                    render: false,
                    params: {
                        ...defaultParams.symbol,
                        filter: filters.LineString,
                        layout: {
                            ...defaultParams.symbol.layout,
                            'symbol-placement': 'line',
                        },
                    },
                },
                'point-shadows': {
                    render: false,
                    params: {
                        ...defaultParams.symbol,
                        layout: {
                            ...defaultParams.symbol.layout,
                        },
                        paint: {
                            ...defaultParams.symbol.paint,
                            'icon-color': 'black',
                            'text-color': 'black',
                        }
                    },
                },
                'points': {
                    render: false,
                    params: defaultParams.symbol,
                },
                'labels': {
                    render: false,
                    params: {
                        ...defaultParams.symbol,
                        filter: ["any", filters.Point, filters.LineString, filters.Polygon],
                        layout: {
                            ...defaultParams.symbol.layout,
                            "text-field": ["get", "name"],
                            "text-size": 12,
                            "text-variable-anchor": ["top", "bottom", "left", "right"],
                            "text-radial-offset": 0.5,
                            "text-justify": "auto",
                            "text-allow-overlap": false
                        }
                    },
                },
            },
        }

        if (customParams) {
            Object.entries(customParams).forEach(([a, b]) => {
                const type = params[a]
                Object.entries(b).forEach(([c, d]) => {
                    const isNewLayer = !(c in type)
                    if (isNewLayer) type[c] = {}

                    const layer = type[c]
                    
                    const render = d.render
                    layer.render = (
                        typeof render === 'boolean' 
                        ? render 
                        : isNewLayer 
                        ? true : 
                        layer.render
                    )

                    const updates = d.params
                    if (updates) {
                        if (isNewLayer) {
                            layer.params = {
                                ...defaultParams[a],
                                ...updates,
                                layout: {
                                    ...defaultParams[a].layout,
                                    ...updates.layout ?? {}
                                },
                                paint: {
                                    ...defaultParams[a].paint,
                                    ...updates.paint ?? {}
                                },
                                metadata: {
                                    ...defaultParams[a].metadata,
                                    ...updates.metadata ?? {}
                                },
                            }
                        } else {
                            layer.params = {
                                ...layer.params,
                                ...updates,
                                layout: {
                                    ...layer.params.layout,
                                    ...updates.layout ?? {}
                                },
                                paint: {
                                    ...layer.params.paint,
                                    ...updates.paint ?? {}
                                },
                                metadata: {
                                    ...layer.params.metadata,
                                    ...updates.metadata ?? {}
                                },
                            }
                        }
                    }
                })
            })
        }

        return params
    }

    updateLayerParams(id, params) {
        const map = this.map
        const layer = map.getStyle().layers.find(l => l.id === id)
        if (!layer) return

        Object.entries(params.layout ?? {}).forEach(([prop, val]) => {
            map.setLayoutProperty(id, prop, val)
        })

        Object.entries(params.paint ?? {}).forEach(([prop, val]) => {
            map.setPaintProperty(id, prop, val)
        })

        if (params.filter) {
            map.setFilter(id, params.filter)
        }

        if (params.minzoom || params.maxzoom) {
            map.setLayerZoomRange(
                id, 
                params.minzoom ?? layer.minzoom,
                params.maxzoom ?? layer.maxzoom
            )
        }

        Object.entries(params.metadata ?? {}).forEach(([prop, val]) => {
            layer.metadata[prop] = val
        })

        return layer
    }

    addGeoJSONLayers(sourceId, {properties, beforeId}={}) {
        const map = this.map
        const source = map.getSource(sourceId)
        if (!source) return
        
        const name = (properties.metadata ??= {}).name = properties.metadata?.name ?? generateRandomString()
        const layerName = `${sourceId}-${name}`
        beforeId = this.getBeforeId(layerName, beforeId)

        const groups = (properties.metadata ??= {}).groups = properties.metadata?.groups ?? {
            default: this.getGeoJSONLayerParams()
        }
        
        Object.keys(groups).forEach(groupId => {
            const group = groups[groupId]
            Object.keys(group).forEach(type => {
                const typeLayers = group[type]
                Object.keys(typeLayers).forEach(role => {
                    if (!typeLayers[role].render) return

                    const id = Array(layerName, groupId, type, role).join('-')
                    
                    const layerParams = {
                        ...typeLayers[role].params,
                        id,
                        type,
                        source: sourceId,
                        metadata: {
                            ...source.metadata,
                            ...typeLayers[role].params.metadata,
                            name,
                            groups,
                            group: groupId,
                            role,
                        },
                    }

                    if (this.map.getLayer(id)) {
                        this.updateLayerParams(id, layerParams)
                    } else {
                        this.map.addLayer(layerParams, beforeId)
                    }
                })
            })
        })

        return this.map.getStyle().layers.filter(l => l.id.startsWith(layerName))
    }

    getSource(id, {properties}={}) {
        if (properties) {
            const type = properties.metadata.params.type
    
            if (type === 'xyz') {
                return this.getXYZSource(id, {properties})
            }
    
            if (type === 'wms') {
                return this.getWMSSource(id, {properties})
            }

            if (Array('wfs').includes(type)) {
                return this.getGeoJSONSource(id, {properties})
            }
        }

        return this.map.getSource(id)
    }

    getXYZSource(sourceId, {properties}={}) {
        const map = this.map
        
        let source = map.getSource(sourceId)
  
        if (!source && properties) {
            const params = properties.metadata?.params
            if (params) {
                const url = pushURLParams(params.url, params.get ?? {})
    
                map.addSource(sourceId, {
                    tileSize: 256,
                    type: "raster",
                    tiles: [url],
                })
    
                source = map.getSource(sourceId)
                Object.entries(properties).forEach(([k,v]) => source[k] = v)
            }
        }

        return source
    }

    getWMSSource(sourceId, {properties}={}) {
        const map = this.map

        let source = map.getSource(sourceId)
        
        if (!source && properties) {
            const params = properties.metadata?.params
            if (params) {
                params.get = Object.fromEntries(
                    Object.entries(params.get)
                    .map(([k,v]) => [k.toUpperCase(), v])
                )
    
                const url = pushURLParams(params.url, {
                    ...params.get,
                    SERVICE: 'WMS',
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: params.name,
                    BBOX: "{bbox-epsg-3857}",
                    WIDTH: 256,
                    HEIGHT: 256,
                    SRS: "EPSG:3857",
                    FORMAT: "image/png",
                    TRANSPARENT: true,
                    STYLES: params.style,
                })
    
                map.addSource(sourceId, {
                    type: "raster",
                    tiles: [url],
                    tileSize: 256,
                })
    
                source = map.getSource(sourceId)
                Object.entries(properties).forEach(([k,v]) => source[k] = v)
            }
        }

        return source
    }

    normalizeLayerParams(params) {
        if (!params.type) {
            params.type = params.format
        }
        
        if (!params.bbox) {
            params.bbox = [-180, -90, 180, 90]
        }
        
        if (!params.crs) {
            params.crs = 'EPSG:4326'
        }
        
        if (!params.title) {
            params.title = params.name
        }

        if (!params.styles) {
            params.styles = {}
        }

        if (!params.style || !(params.style in params.styles)) {
            params.style = Object.keys(params.styles)[0]
        }

        if (!params.attribution && params.url) {
            const domain = (new URL(params.url)).host.split('.').slice(-2).join('.')
            params.attribution = `<span class='text-muted fw-lighter'>Data from <a class='text-decoration-none text-reset' href="https://www.${domain}/" target="_blank">${domain}</a></span>`
        }
        
        return params
    }

    addRasterLayer (source, properties) {
        const map = this.map
        
        const metadata = properties.metadata
        const params = metadata?.params
        const name = metadata?.name ?? generateRandomString()
        const id = `${source.id}-${name}`
        const beforeId = this.getBeforeId(id)

        map.addLayer({
            id,
            type: "raster",
            source: source.id,
            metadata: {
                ...source.metadata,
                params: {
                    ...source.metadata.params,
                    ...params,
                },
                name,
                popup: {
                    active: params.type === 'wms' ? true : false,
                },
                ...metadata,
            },
        }, beforeId)   

        const layer = map.getLayer(id)

        return layer
    }

    async addLayer(properties, {sourceId}={}) {
        const params = (properties.metadata ??= {}).params = this.normalizeLayerParams(properties.metadata?.params)
        
        if (!sourceId) {
            sourceId = await hashJSON(params) 
        }
        
        const source = this.getSource(sourceId, {properties})

        if (Array('xyz', 'wms').includes(params.type)) {
            this.addRasterLayer(source, properties)
        }
        
        if (Array('wfs').includes(params.type)) {
            this.addGeoJSONLayers(sourceId, {properties})
        }
    }
}