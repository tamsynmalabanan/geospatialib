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

    // "all", "any", "none"
    // [
    //     "all", 
    //     ["==", "$type", "Polygon"],
    //     [
    //         "any",
    //         ["==", "landuse", "park"],
    //         [
    //             "none",
    //             [">", "population", 5000],
    //             ["==", "region", "north"]
    //         ]
    //     ]
    // ]
    
    // "==", "!=", ">", "<", ">=", "<=",
    // ["==", "highway", "primary"] 
    
    // "has", "!has"
    // ["has", "name"]
    
    // "in", "!in"
    // ["in", "class", "park", "forest"]

    // ["within", {"type": "Polygon", "coordinates": [...]}]
    //  - this wont work in filter so create a temp property defining spatial relationship with geom


    filterGeoJSON(geojson, filter) {
        const combinators = {
            all: null,
            any: null,
            none: null,
        }

        const operators = {
            comparison: {
                options: ["==", "!=", ">", ">=", "<", "<="],
            },
            existential: {
                options: ['has', '!has'],
            },
            membership: {
                options: ['in', '!in'],
            },
        }
    }

    getVectorTypeParams({color=getRandomColor()}={}) {
        const hsla = hslaColor(color)
        const opacity = hsla.a
        const fillColor = hsla.toString({a:1})
        const haloColor = hsla.toString({l:Math.max(100,hsla.l*2),a:opacity/2})
        const outlineColor = hsla.toString({l:hsla.l*0.5, a:1})
        const sortKey = 0
        const antialias = true
        const pattern = null
        const translate = [0,0]
        const translateAnchor = 'map'
        const blur = 0
        const width = 2
        const visibility = 'visible'
        const allowOverlap = false
        const overlap = 'never' // never, always, cooperative
        const ignorePlacement = false
        const optional = false
        const rotate = 0
        const padding = 2 //[2]
        const offset = [0,0]
        const anchor = 'center' // center, left, right, top, bottom, top-left, top-right, bottom-left, bottom-right
        const alignment = 'auto'
        const minzoom = 0
        const maxzoom = 24

        return {
            'background': {
                type: 'background',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                },
                paint: {
                    'background-color': getPreferredTheme() === 'light' ? 'white' : 'black',
                    'background-pattern': pattern,
                    'background-opacity': opacity/4,
                }
            },
            'fill': {
                type: 'fill',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                    'fill-sort-key': sortKey,
                },
                paint: {
                    'fill-antialias': antialias,
                    'fill-opacity': opacity/2,
                    'fill-color': fillColor,
                    'fill-outline-color': outlineColor,
                    'fill-translate': translate,
                    'fill-translate-anchor': translateAnchor,
                    'fill-pattern': pattern,
                }
            },
            'circle': {
                type: 'circle',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                    'circle-sort-key': sortKey,
                },
                paint: {
                    'circle-radius': 6,
                    'circle-color': fillColor,
                    'circle-blur': blur,
                    'circle-opacity': opacity,
                    'circle-translate': translate,
                    'circle-translate-anchor': translateAnchor,
                    'circle-pitch-scale': 'map',
                    'circle-pitch-alignment': 'viewport',
                    'circle-stroke-width': width,
                    'circle-stroke-color': outlineColor,
                    'circle-stroke-opacity': opacity,
                }
            },
            'heatmap': {
                type: 'heatmap',
                minzoom,
                maxzoom,
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
                        0, hsla.toString({a:0}),
                        1, fillColor
                    ],
                    'heatmap-opacity': opacity,
                }
            },
            'fill-extrusion': {
                type: 'fill-extrusion',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                },
                paint: {
                    'fill-extrusion-opacity': opacity,
                    'fill-extrusion-color': fillColor,
                    'fill-extrusion-translate': translate,
                    'fill-extrusion-translate-anchor': translateAnchor,
                    'fill-extrusion-pattern': pattern,
                    'fill-extrusion-height': 10,
                    'fill-extrusion-base': 0,
                    'fill-extrusion-vertical-gradient': true,
                }
            },
            'line': {
                type: 'line',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                    'line-cap': 'butt',
                    'line-join': 'miter',
                    'line-miter-limit': 2,
                    'line-round-limit': 1.05,
                    'line-sort-key': sortKey,
                },
                paint: {
                    'line-opacity': opacity,
                    'line-color': fillColor,
                    'line-translate': translate,
                    'line-translate-anchor': translateAnchor,
                    'line-width': width,
                    'line-gap-width': 0,
                    'line-offset': 0,
                    'line-blur': blur,
                    'line-dasharray': null,
                    'line-pattern': pattern,
                    'line-gradient': null,
                }
            },
            'symbol': {
                type: 'symbol',
                minzoom,
                maxzoom,
                layout: {
                    visibility,
                    'symbol-placement': 'point',
                    'symbol-spacing': 250,
                    'symbol-avoid-edges': false,
                    'symbol-sort-key': sortKey,
                    'symbol-z-order': 'auto',
                    
                    'icon-allow-overlap': allowOverlap,
                    'icon-overlap': overlap,
                    'icon-ignore-placement': ignorePlacement,
                    'icon-optional': optional,
                    'icon-rotation-alignment': alignment,
                    'icon-size': 1,
                    'icon-text-fit': 'none',
                    'icon-text-fit-padding': [0,0,0,0],
                    'icon-image': null,
                    'icon-rotate': rotate,
                    'icon-padding': padding,
                    'icon-keep-upright': false,
                    'icon-offset': offset,
                    'icon-anchor': anchor,
                    'icon-pitch-alignment': alignment,
                    
                    'text-pitch-alignment': alignment,
                    'text-rotation-alignment': alignment,
                    'text-field': null,
                    'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                    'text-size': 16,
                    'text-max-width': 10,
                    'text-line-height': 1.2,
                    'text-letter-spacing': 0,
                    'text-justify': 'auto', // auto, left, center, right,
                    'text-radial-offset': 0,
                    'text-variable-anchor': null,
                    'text-variable-anchor-offset': null,
                    'text-anchor': anchor,
                    'text-max-angle': 45,
                    'text-writing-mode': null,
                    'text-rotate': rotate,
                    'text-padding': padding,
                    'text-keep-upright': true,
                    'text-transform': 'none', // none, uppercase, lowercase
                    'text-offset': offset,
                    'text-allow-overlap': allowOverlap,
                    'text-overlap': overlap,
                    'text-ignore-placement': ignorePlacement,
                    'text-optional': optional,
                },
                paint: {
                    'icon-opacity': opacity,
                    'icon-color': fillColor,
                    'icon-halo-color': haloColor,
                    'icon-halo-width': width*3,
                    'icon-halo-blur': blur,
                    'icon-translate': translate,
                    'icon-translate-anchor': translateAnchor,

                    'text-opacity': opacity,
                    'text-color': fillColor,
                    'text-halo-color': haloColor,
                    'text-halo-width': width*3,
                    'text-halo-blur': blur,
                    'text-translate': translate,
                    'text-translate-anchor': translateAnchor,
                }
            },
            'misc': {
                shadowColor: 'black',
                shadowTranslate: [-2.5, 2.5],
                shadowOpacity: 0.5,
                labelField: ["get", "name"],
                labelSize: 12,
                labelVariableAnchor: ["top", "bottom", "left", "right"],
                labelRadialOffset: 0.5,
                labelJustify: 'auto',
                labelAllowOverlap: false,
            }
        }
    }

    getVectorGroupParams({
        title='',
        active=true,
        color=getRandomColor(),
        minzoom=0,
        maxzoom=24,
        geometryFilters,
        propertyFilters,
        spatialFilters,
    }={}) {
        const typeParams = this.getVectorTypeParams({color})
        const misc = typeParams.misc
        const filters = Object.fromEntries(Array(
            'Polygon', 'LineString', 'Point'
        ).map(i => [i, ["==", "$type", i]]))


        const layers = Array(
            {
                name: 'layer background', 
                type: 'background',
                layout: {
                    visibility: 'none'
                },
            }, 
            {
                name: 'polygon shadow',
                type: 'fill',
                geometryFilters: ['Polygon'],
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'fill-color': misc.shadowColor,
                    'fill-opacity': misc.shadowOpacity,
                    'fill-translate': misc.shadowTranslate,
                }
            },
            {
                name: 'polygon fill',
                type: 'fill',
                geometryFilters: ['Polygon'],
            },
            {
                name: 'polygon outline',
                type: 'line',
                geometryFilters: ['Polygon'],
                paint: {
                    'line-opacity': 1,
                    'line-color': typeParams.fill.paint['fill-color'],
                    'line-width': 2,
                }
            },
            {
                name: 'polygon 3D shadow',
                type: 'fill-extrusion',
                geometryFilters: ['Polygon'],
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'fill-extrusion-color': misc.shadowColor,
                    'fill-extrusion-opacity': misc.shadowOpacity,
                    'fill-extrusion-translate': misc.shadowTranslate,
                }
            },
            {
                name: 'polygon 3D fill',
                type: 'fill-extrusion',
                geometryFilters: ['Polygon'],
                layout: {
                    visibility: 'none'
                },
            },
            {
                name: 'line shadow',
                type: 'line',
                geometryFilters: ['LineString'],
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'line-opacity': misc.shadowOpacity,
                    'line-color': misc.shadowColor,
                    'line-translate': misc.shadowTranslate,
                }
            },
            {
                name: 'line',
                type: 'line',
                geometryFilters: ['LineString'],
            },
            {
                name: 'line symbol shadow',
                type: 'symbol',
                geometryFilters: ['LineString'],
                layout: {
                    visibility: 'none',
                    'symbol-placement': 'line',
                    'icon-offset': misc.shadowTranslate,
                },
                paint: {
                    'icon-color': misc.shadowColor,
                    'text-color': misc.shadowColor,
                }
            },
            {
                name: 'line symbol',
                type: 'symbol',
                geometryFilters: ['LineString'],
                layout: {
                    visibility: 'none',
                    'symbol-placement': 'line',
                }
            },
            {
                name: 'heatmap',
                type: 'heatmap',
                geometryFilters: ['Point'],
                layout: {
                    visibility: 'none',
                },
            },
            {
                name: 'point shadow',
                type: 'circle',
                geometryFilters: ['Point'],
                layout: {
                    visibility: 'none',
                },
                paint: {
                    "circle-color": misc.shadowColor,
                    "circle-opacity": misc.shadowOpacity,
                    "circle-translate": misc.shadowTranslate,
                }
            },
            {
                name: 'point',
                type: 'circle',
                geometryFilters: ['Point'],
            },
            {
                name: 'point symbol shadow',
                type: 'symbol',
                geometryFilters: ['Point'],
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'icon-color': misc.shadowColor,
                    'text-color': misc.shadowColor,
                }
            },
            {
                name: 'point symbol',
                type: ['symbol'],
                geometryFilters: ['Point'],
                layout: {
                    visibility: 'none',
                },
            },
            {
                name: 'label',
                type: 'symbol',
                geometryFilters: ['Polygon', 'LineString', 'Point'],
                layout: {
                    visibility: 'none',
                    "text-field": misc.labelField,
                    "text-size": misc.labelSize,
                    "text-variable-anchor": misc.labelVariableAnchor,
                    "text-radial-offset": misc.labelRadialOffset,
                    "text-justify": misc.labelJustify,
                    "text-allow-overlap": misc.labelAllowOverlap,
                }
            },
        ).map(l => {
            const params = structuredClone(typeParams[l.type])
            
            if ((l.geometryFilters ??= []).length) {
                params.filter = [
                    "all",
                    ["any", ...(l.geometryFilters.map(i => filters[i]))],
                    ...(l.filter?.length ? [l.filter]: []),
                    ...(filter?.length ? [filter]: [])
                ]
            }

            Array('paint', 'layout').forEach(i => {
                params[i] = {
                    ...Object.fromEntries(
                        Object.entries(params[i])
                        .filter(([k,v]) => v !== null)
                    ), ...l[i]
                }
            })

            params.minzoom = Math.max(...([l.minzoom, minzoom].map(i => i ?? 0)))
            params.maxzoom = Math.min(...([l.maxzoom, maxzoom].map(i => i ?? 24)))

            return {
                typeId: generateRandomString(),
                name: l.name,
                geometryFilters: l.geometryFilters,
                filter: l.filter,
                minzoom: l.minzoom,
                maxzoom: l.maxzoom,
                params,
            } // group layer definition
        })

        return {
            groupId: generateRandomString(),
            title,
            active,
            color,
            minzoom,
            maxzoom,
            filter,
            layers,
        } // group definition
    }

    addGeoJSONLayers(sourceId, {properties={}, beforeId}={}) {
        const map = this.map
        const source = map.getSource(sourceId)
        if (!source) return
        
        const metadata = properties.metadata ??= {}
        const name = metadata.name ??= generateRandomString()
        const layerName = metadata.layerName ??= `${sourceId}-${name}`
        beforeId = this.getBeforeId(layerName, beforeId)

        const params = metadata.params ??= {}
        const styles = params.styles ??= {default: [this.getVectorGroupParams()]}
        const styleName = params.style = params.style in styles ? params.style : Object.keys(styles)[0]
        const style = styles[styleName]

        style.forEach(group => {
            const groupId = group.groupId
            if (!group.active) return
            group.layers.forEach(layer => {
                const {type, paint, layout, minzoom, maxzoom, filter} = layer.params
                if (layout.visibility === 'none') return

                const typeId = layer.typeId
                const id = Array(layerName, groupId, type, typeId).join('-')

                const layerParams = {
                    source: sourceId,
                    id,
                    type,
                    paint,
                    layout,
                    minzoom: Math.max(...[minzoom, properties.minzoom, group.minzoom].map(v => v ?? 0)),
                    maxzoom: Math.min(...[maxzoom, properties.maxzoom, group.maxzoom].map(v => v ?? 24)),
                    filter: [
                        "all", 
                        ...(filter?.length ? [filter]: []),
                        ...(group.filter?.length ? group.filter : []),
                        ...(properties.filter?.length ? [properties.filter] : []),
                    ],
                    metadata: {
                        ...source.metadata,
                        ...properties.metadata,
                        name,
                        layerName,
                        groupId,
                        typeId,
                        params: {
                            tooltip: {
                                active: true,
                            },
                            popup: {
                                active: true,
                            },
                            ...source.metadata?.params,
                            ...properties.metadata.params,
                        },
                    },
                }

                if (this.map.getLayer(id)) {
                    this.updateLayerParams(id, layerParams)
                } else {
                    this.map.addLayer(layerParams, beforeId)
                }
            })
        })

        return this.map.getStyle().layers.filter(l => l.id.startsWith(layerName))
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

        Object.entries((params.metadata ??= {}).params ?? {}).forEach(([prop, val]) => {
            (layer.metadata.params ??= {})[prop] = val
        })

        return map.getLayer(layer)
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

        if (params.styles) {
            if (!params.style || !(params.style in params.styles)) {
                params.style = Object.keys(params.styles)[0]
            }
        }

        if (!params.attribution && params.url) {
            const domain = (new URL(params.url)).host.split('.').slice(-2).join('.')
            params.attribution = `<span class='text-muted fw-lighter'>Data from <a class='text-decoration-none text-reset' href="https://www.${domain}/" target="_blank">${domain}</a></span>`
        }

        if (params.type === 'wfs') {
            params.get = Object.fromEntries(
                Object.entries(params.get ?? {})
                .map(([k,v]) => [k.toLowerCase(), v])
            )
        }

        if (params.type === 'wms') {
            params.get = Object.fromEntries(
                Object.entries(params.get ?? {})
                .map(([k,v]) => [k.toUpperCase(), v])
            )
        }
        
        return params
    }

    addRasterLayer (source, properties) {
        const map = this.map
        
        const metadata = properties.metadata = properties.metadata ?? {}
        const params = metadata.params = metadata.params ?? {}
        const name = metadata.name = metadata.name ?? generateRandomString()
        
        const id = `${source.id}-${name}`
        const beforeId = this.getBeforeId(id)

        map.addLayer({
            id,
            type: "raster",
            source: source.id,
            metadata: {
                ...source.metadata,
                ...metadata,
                params: {
                    ...source.metadata.params,
                    ...params,
                    popup: {
                        active: params.type === 'wms' ? true : false,
                    },
                },
                layerName: id,
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
            this.addGeoJSONLayers(sourceId, {properties: structuredClone(properties)})
        }
    }
}