class SettingsControl {     
    constructor(options = {}) {
        this.options = options
        this.container = null
        
        this.settings = null
        this.config = {
            basemapGrayscale: getPreferredTheme() !== 'light',
            showTooltip: true,
            tooltip: null,
            renderHillshade: true,
            projection: 'mercator',
            popup: {
                control: null,
                feature: null,
                toggle: null,
            },
            nameProperties: ['display_name', 'name', 'title', 'id'],
            vectorSourceTypes: [
                'overpass'
            ],
            fixedLayers: [
                'searchResultBounds',
                'popupFeature', 
                'placeSearch',
            ],
            popupLayers: null,
            tooltipLayers: null,
            tooltipTimeout: null,
            vectorLayerTypes: Array('fill', 'line', 'circle', 'symbol', 'heatmap', 'fill-extrusion')
        }
    }
    
    // CONTROL HANDLERS
    setFullscreenControl({
        position='bottom-right',
    }={}) {
        const control = new maplibregl.FullscreenControl()
        this.map.addControl(control, position)
    }
    
    setGeolocateControl({
        position='top-left',
    }={}) {
        const control = new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true,
        });
        this.map.addControl(control, position)
    }
    
    setNavControl({
        visualizePitch=true,
        showZoom=true,
        showCompass=true,
        position='top-left',
    }={}) {
        const control = new maplibregl.NavigationControl({
            visualizePitch,
            showZoom,
            showCompass,
        })
        this.map.addControl(control, position)

        const zoomInBtn = control._container.querySelector('.maplibregl-ctrl-zoom-in')
        zoomInBtn.innerHTML = ''
        zoomInBtn.classList.add('bi', 'bi-plus', 'fs-16', `text-bg-${getPreferredTheme()}`, 'rounded-top')
        
        const zoomOutBtn = control._container.querySelector('.maplibregl-ctrl-zoom-out')
        zoomOutBtn.innerHTML = ''
        zoomOutBtn.classList.add('bi', 'bi-dash', 'fs-16', `text-bg-${getPreferredTheme()}`, `border-top-${getPreferredTheme()}`)
        
        const compassBtn = control._container.querySelector('.maplibregl-ctrl-compass')
        compassBtn.classList.add(`text-bg-${getPreferredTheme()}`, `border-top-${getPreferredTheme()}`, 'rounded-bottom')
    }
    
    setScaleControl({
        unit='metric',
        maxWidth=200,
        position='bottom-right',
    }={}) {
        const control = new maplibregl.ScaleControl({
            maxWidth,
            unit,
        })
        this.map.addControl(control, position)
    }
    
    configAttributionControl() {
        const control = this.map._controls.find(c => c instanceof maplibregl.AttributionControl)
        const container = control._container
        container.style.maxWidth = `${window.innerWidth * 0.6}px`
        container.style.marginTop = `0px`

        const toggle = container.querySelector(`.maplibregl-ctrl-attrib-button`)
        toggle.innerHTML = `<i class="bi bi-info fs-16"></i>`
        toggle.style.backgroundImage = 'none'
        toggle.style.boxShadow = 'none'
        toggle.classList.add('d-flex', 'justify-content-center', 'align-items-center', `text-bg-${getPreferredTheme()}`)

        const inner = container.querySelector(`.maplibregl-ctrl-attrib-inner`)
        const observer = new MutationObserver(() => {
            inner.querySelectorAll(`a`).forEach(a => {
                a.setAttribute('target', '_blank')
                a.classList.add('text-reset', 'text-decoration-none')
            })
        })
        observer.observe(inner, { childList: true, subtree: true })
    }
    
    setTerrainControl({
        source='terrain',
        exaggeration=1,
        position='top-left',
    }={}) {
        const map = this.map
        if (!map.getSource(source)) return

        const control = new maplibregl.TerrainControl({
            source,
            exaggeration,
        })
        map.addControl(control, position)
        map.setTerrain(null)

        control._container.querySelector('button').addEventListener('click', () => {
            this.toggleHillshade()
        })
    }
    
    setPlaceSearchControl({
        position='top-left',
    }={}) {
        const control = new PlaceSearchControl()
        this.map.addControl(control, position)
    }
    
    setFitToWorldControl({
        position='top-left',
    }={}) {
        const control = new FitToWorldControl()
        this.map.addControl(control, position)
    }
    
    setUserControl({
        position='bottom-left',
    }={}) {
        const control = new UserControl()
        this.map.addControl(control, position)

        const event = new Event('userControlInit')
        this.map._container.dispatchEvent(event)
    }
    
    setLegendControl({
        position='top-right',
    }={}) {
        const control = new LegendControl()
        this.map.addControl(control, position)
    }

    createSettingsControl() {
        const isDarkMode = getPreferredTheme() !== 'light'
        if (isDarkMode) this.toggleBasemapGrayscale()

        const container = this.container = customCreateElement({className: 'maplibregl-ctrl maplibregl-ctrl-group'})

        const handlers = {
            projections: ({body, head}={}) => {
                this.setProjection()

                head.innerText = 'Projection options'

                const options = {
                    mercator: {
                        label: 'Web Mercator',
                        icon: '🗺️',
                    },
                    globe: {
                        label: '3D Globe',
                        icon: '🌍',
                    },
                }

                Object.keys(options).forEach(name => {
                    const params = options[name]
                    
                    const checked = this.getProjection() === name
                    
                    const input = customCreateElement({
                        tag: 'input',
                        parent: body,
                        attrs: {
                            type: 'radio',
                            name: 'projection',
                            ...(checked ? {checked: true} : {})
                        },
                        className: 'btn-check'
                    })
                    
                    const label = titleToTooltip(customCreateElement({
                        tag: 'label',
                        parent: body,
                        className: `btn btn-sm btn-${getPreferredTheme()}`,
                        attrs: {
                            title: params.label,
                            for: input.id,
                        },
                        innerText: params.icon,
                        events: {
                            click: (e) => {
                                this.setProjection({type: name})
                            }
                        }
                    }))
                })

                return body
            },
            popup: ({body, head}={}) => {
                this.map.getCanvas().style.cursor = 'pointer'

                this.setGeoJSONData('popupFeature', {metadata:{params: {title: 'Popup feature'}}})

                head.innerText = 'Popup options'

                const options = {
                    toggle: {
                        label: 'Toggle popup',
                        icon: '💬',
                    },
                    // elev: {
                    //     label: 'Elevation', // and bathymetry
                    //     icon: '🏔️',
                    // },
                    layers: {
                        label: 'Layers',
                        icon: '📚',
                    },
                    osm: {
                        label: 'Openstreetmap',
                        icon: '🗾',
                    },
                }

                Object.keys(options).forEach(name => {
                    const params = options[name]
                    const isToggle = name === 'toggle'

                    const input = customCreateElement({
                        tag: 'input',
                        parent: body,
                        attrs: {
                            type: 'checkbox',
                            name: `popup-${name}`,
                            checked: true,
                        },
                        className: 'btn-check'
                    })
                    
                    const label = titleToTooltip(customCreateElement({
                        tag: 'label',
                        parent: body,
                        className: `btn btn-sm btn-${getPreferredTheme()}`,
                        attrs: {
                            title: params.label,
                            for: input.id,
                        },
                        innerText: params.icon,
                        events: {
                            ...(isToggle ? {
                                click: (e) => {
                                    const checked = !input.checked
                                    
                                    const toggleSelector = '[name="popup-toggle"]'
                                    const inputs = Array.from(body.querySelectorAll(`input:not(${toggleSelector})`))
                                    
                                    inputs.forEach(el => el.disabled = !checked)
                                    this.map.getCanvas().style.cursor = checked ? 'pointer' : ''

                                    if (!checked) {
                                        this.config.popup.control?.remove()
                                    } 
                                }
                            } : {
                                click: (e) => {
                                    const toggleSelector = '[name="popup-toggle"]'
                                    const toggle = body.querySelector(`input${toggleSelector}`)
                                    const inputs = Array.from(body.querySelectorAll(`input:not(${toggleSelector})`))

                                    this.map.getCanvas().style.cursor = toggle.checked ? 'pointer' : ''
                                }
                            })
                        }
                    }))
                })

                return body
            },
            misc: ({body, head}={}) => {
                head.innerText = 'More options'

                const checkboxOptions = {
                    hillshade: {
                        label: 'Toggle hillshade',
                        icon: '⛰️',
                        checked: true,
                        events: {
                            click: (e) => {
                                this.config.renderHillshade = !this.config.renderHillshade
                                this.toggleHillshade()
                            }
                        }
                    },
                    basemap: {
                        label: 'Toggle colored basemap',
                        icon: '🗺️',
                        checked: !isDarkMode,
                        events: {
                            click: (e) => {
                                this.config.basemapGrayscale = !this.config.basemapGrayscale
                                this.toggleBasemapGrayscale()
                            }
                        }
                    },
                    theme: {
                        label: 'Toggle dark mode',
                        icon: '🌙',
                        checked: isDarkMode,
                        events: {
                            click: toggleTheme,
                        }
                    },
                    tooltip: {
                        label: 'Toggle tooltip',
                        icon: '💬',
                        checked: true,
                        events: {
                            click: (e) => {
                                this.config.showTooltip = !this.config.showTooltip
                                this.config.tooltip?.remove()
                            }
                        }
                    },
                }

                Object.keys(checkboxOptions).forEach(name => {
                    const params = checkboxOptions[name]
                    const input = customCreateElement({
                        tag: 'input',
                        parent: body,
                        attrs: {
                            type: 'checkbox',
                            name,
                            ...(params.checked ? {checked: params.checked} : {})
                        },
                        className: 'btn-check'
                    })
                    
                    const label = titleToTooltip(customCreateElement({
                        tag: 'label',
                        parent: body,
                        className: `btn btn-sm btn-${getPreferredTheme()}`,
                        attrs: {
                            title: params.label,
                            for: input.id,
                        },
                        innerText: params.icon,
                        events: params.events,
                    }))
                })

                const buttonOptions = {
                    storage: {
                        label: 'Clear stored data',
                        icon: '🗑️',
                        attrs: {
                            type: 'button',
                            'data-bs-toggle': 'modal',
                            'data-bs-target': '#clearLocalDataModal'
                        }
                    }
                }

                Object.keys(buttonOptions).forEach(name => {
                    const params = buttonOptions[name]
                    const button = customCreateElement({
                        tag: 'button',
                        parent: body,
                        attrs: {
                            ...params.attrs,
                            title: params.label
                        },
                        innerText: params.icon
                    })
                })

                return body
            },
        }

        const dropdown = customCreateElement({
            parent: container,
            className: 'dropdown gsl-settings-control'
        })

        const button = customCreateElement({
            tag: 'button',
            parent: dropdown,
            className: 'fs-16',
            attrs: {
                type: 'button',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': false
            },
            innerText: '⚙️'
        })

        const menu = customCreateElement({
            tag: 'form',
            parent: dropdown,
            className: 'dropdown-menu mb-1 maplibregl-ctrl maplibregl-ctrl-group'
        })

        menu.addEventListener('click', (e) => {
            e.stopPropagation()
        })

        const content = customCreateElement({
            parent: menu,
            className: 'd-flex flex-column px-2 gap-2'
        })
        
        this.settings = Object.keys(handlers).reduce((acc, name) => {
            const item = customCreateElement({
                tag: 'div',
                parent: content,
                className: 'd-flex flex-column gap-1',
            })

            const collapse = customCreateElement({
                className:'collapse show'
            })
            
            const toggle = customCreateElement({
                parent: item,
                tag: 'a', 
                className: 'text-reset text-decoration-none',
                attrs: {
                    'data-bs-toggle': 'collapse',
                    href: `#${collapse.id}`,
                    role: 'button',
                    'aria-expanded': true,
                    'aria-controls': collapse.id
                },
            })
            
            const head = customCreateElement({
                parent: toggle,
                tag: 'span',
                className: 'fs-12 user-select-none fw-bold text-secondary'
            })
            
            item.appendChild(collapse)
            
            const body = customCreateElement({
                parent: collapse,
                className: 'd-flex flex-wrap gap-1'
            })

            acc[name] = handlers[name]({body, head})

            return acc
        }, {})
    }

        
    // MAP METHODS
    setProjection({type='mercator'}={}) {
        if (!type) type = 'mercator'
        this.map.setProjection({type})
        this.config.projection = type
    }
    
    getProjection() {
        return this.config.projection
    }

    toggleBasemapGrayscale() {
        if (!this.map.getLayer('basemap')) return

        let basemapPaint
        let skyPaint
        
        if (this.config.basemapGrayscale) {
            basemapPaint = {
                'raster-opacity': 1, // 0 to 1
                'raster-hue-rotate': 200,
                'raster-brightness-min': 0, // 0 to 1
                'raster-brightness-max': 0.01, // 0 to 1
                'raster-saturation': -1, // -1 to 1
                'raster-contrast': 0.99, // -1 to 1
            }

            skyPaint = {
                "sky-color": "hsla(208, 95%, 15%, 1.00)",
                "horizon-color": "hsla(0, 0%, 50%, 1.00)",
                "fog-color": "hsla(0, 0%, 50%, 1.00)",
                "fog-ground-blend": 0.5,
                "horizon-fog-blend": 0.8,
                "sky-horizon-blend": 0.8,
                "atmosphere-blend": 0.8
            }
        } else {
            basemapPaint = {
                'raster-opacity': 1, // 0 to 1
                'raster-hue-rotate': 0,
                'raster-brightness-min': 0, // 0 to 1
                'raster-brightness-max': 1, // 0 to 1
                'raster-saturation': 0, // -1 to 1
                'raster-contrast': 0, // -1 to 1
            }

            skyPaint = {
                "sky-color": "hsla(208, 95%, 76%, 1.00)",
                "horizon-color": "#ffffff",
                "fog-color": "#ffffff",
                "fog-ground-blend": 0.5,
                "horizon-fog-blend": 0.8,
                "sky-horizon-blend": 0.8,
                "atmosphere-blend": 0.8
            }
        }

        const newStyle = structuredClone(this.map.getStyle())
        newStyle.sky = skyPaint
        this.map.setStyle(newStyle)

        this.updateGeoJSONLayer('basemap', {paint:basemapPaint})

        const source = this.map.getSource('basemap')
        if (source && source.tiles) {
            source.setTiles(source.tiles)
        }
    }

    getMapBbox() {
        const bounds = this.map.getBounds()
        let [w,s,e,n] = [
            'getWest',
            'getSouth',
            'getEast',
            'getNorth',
        ].map(i => bounds[i]())

        if (w < -180) w = -180
        if (s < -90) s = -90
        if (e > 180) e = 180
        if (n > 90) n = 90

        return [w,s,e,n]
    }

    configBboxFields() {
        const handler = (e) => {
            const geom = JSON.stringify(turf.bboxPolygon(this.getMapBbox()).geometry)
            this.map.getContainer().querySelectorAll(`[data-map-bbox-field="true"]`).forEach(el => {
                el.value = geom
            })
        }

        this.map.getContainer().addEventListener('htmx:afterSwap', handler)
        this.map.on('moveend', handler)
    }

    handleMetadataSources(container) {
        container.querySelectorAll(`[data-map-layer-metadata]:not(input.form-check-input)`).forEach(async el => {
            const params = JSON.parse(el.getAttribute('data-map-layer-metadata') ?? '{}')
            if (!['url', 'format', 'name'].every(i => i in params)) return
            
            el.addEventListener('click', (e) => {
                this.addLayerFromParams(params)
            })

            const sourcePrefix = Array(params.type, await hashJSON({
                url:params.url,
                format:params.format,
                name:params.name,
            })).join('-')
            
            if (this.map.getStyle().layers.find(l => l.source.startsWith(sourcePrefix))) {
                el.classList.add('text-success')
            }
            
            Array('layeradded', 'layerremoved').forEach(type => {
                this.map.on(type, (e) => {
                    const layerId = e.type === 'layeradded' ? e.layer.id : e.layerId
                    if (!layerId.startsWith(sourcePrefix)) return
    
                    if (this.map.getStyle().layers.find(l => l.source.startsWith(sourcePrefix))) {
                        el.classList.add('text-success')
                    } else {
                        el.classList.remove('text-success')
                    }
                })
            })
        })
    } 

    handleBboxSources(container) {
        container.querySelectorAll(`[data-map-layer-bbox]`).forEach(el => {
            const bbox = el.getAttribute('data-map-layer-bbox')
            if (!bbox) return
            
            el.addEventListener('click', (e) => {
                try {
                    this.map.fitBounds(JSON.parse(bbox), {padding:100, maxZoom:11})
                } catch (error) {
                    console.log(error)
                    console.log(bbox)
                }
            })
        })
    }

    handleHTMXContent() {
        this.map._container.addEventListener('htmx:afterSwap', (e) => {
            const container = e.target.parentElement
            this.handleBboxSources(container)
            this.handleMetadataSources(container)
        })
    }

    configMapAddLayer() {
        const originalAddLayer = this.map.addLayer.bind(this.map)

        this.map.addLayer = (layer, beforeId) => {
            const result = originalAddLayer(layer, beforeId)
            this.map.fire('layeradded', { layer })
            return result
        }
    }

    configRemoveLayer() {
        const originalRemoveLayer = this.map.removeLayer.bind(this.map)

        this.map.removeLayer = (layerId) => {
            const result = originalRemoveLayer(layerId)
            this.map.fire('layerremoved', { layerId })
            return result
        }
    }

    syncTheme() {
        this.map.getCanvas().classList.add(`bg-${getPreferredTheme()}`)
        this.map.getContainer().querySelectorAll('.maplibregl-ctrl').forEach(b => b.classList.add(`text-bg-${getPreferredTheme()}`))
    }

    
    // SOURCE METHODS
    setTerrainSource({
        source = 'terrain',
        exaggeration = 1,
    } = {}) {
        if (!this.map.getSource(source)) return
        this.map.setTerrain({ source, exaggeration })
    }
    
    toggleHillshade(){
        const map = this.map
        const source = map.getTerrain()?.source

        if (source && this.config.renderHillshade) {
            if (!map.getLayer('hillshade')) {
                map.addLayer({
                    id: 'hillshade',
                    type: 'hillshade',
                    source,
                });
            }
        } else {
            if (map.getLayer('hillshade')) {
                map.removeLayer('hillshade')
            }
        }
    }

    resetGeoJSONSource(sourceId) {
        const source = this.map.getSource(sourceId)
        if (!source) return

        this.removeGeoJSONLayers(sourceId)
        this.setGeoJSONData(sourceId)
    }
    
    async setGeoJSONData(sourceId, {
        data,
        metadata,
        attribution,
    }={}) {
        const map = this.map
        
        if (data) {
            await normalizeGeoJSON(data)
        } else {
            data = turf.featureCollection([])
        }

        let source = map.getSource(sourceId)
        if (source) {
            source.setData(data)
            if (metadata) source.metadata = metadata
            if (attribution) source.attribution = attribution
        } else {
            map.addSource(sourceId, {
                data,
                type: "geojson",
                generateId: true,
                // 'line-gradient': true,
                attribution: attribution ?? metadata?.attribution ?? data[Object.keys(data).find(i => Array(
                    'attribution', 
                    'license', 
                    'licence', 
                    'copyright', 
                    'constraints'
                ).find(j => i.includes(j)))] ?? '',
                
                //minzoom,
                //maxzoom,
                //tolerance,
                //promoteId: 'id',
                //cluster,
                //clusterRadius,
                //clusterMaxZoom,
                //clusterMinPoints,
                //clusterProperties,
            })

            source = map.getSource(sourceId)
            source.metadata = metadata ?? {
                // default metadata properties
            }
        }

        return source
    }


    // LAYER METHODS
    async getCanvasData({
        event,
        bbox, // [[50, 50], [200, 200]]
        point,
        layers,
        filter,
        queryRasters=false,
    }) {
        const pos = bbox ?? point ?? event?.point
        if (!pos) return []

        let features = this.map.queryRenderedFeatures(pos, {layers, filter})

        if (queryRasters) {
            console.log('update features with features from rasters i.e. wms, dems, etc.')

            const sources = {}
 
            this.map.getStyle().layers.forEach(l => {
                if (layers?.length && !layers.includes(l.id)) return
                if (l.source in sources) return
                sources[l.source] = this.map.getSource(l.source)
            })

            for (const source of Object.values(sources)) {
                const metadata = source.metadata
                const params = metadata?.params

                let refFeature
                if (bbox) {
                    const [w,n] = Object.values(this.map.unproject(bbox[0]))
                    const [e,s] = Object.values(this.map.unproject(bbox[1]))
                    refFeature = turf.bboxPolygon([w,s,e,n])
                } else {
                    refFeature = turf.point(Object.values(point ? this.map.unproject(point) : event?.lngLat))
                }

                if (!turf.booleanIntersects(refFeature, turf.bboxPolygon(params?.bbox ?? [-180, -90, 180, 90]))) continue

                let data

                if (Array('wms').includes(params?.type)) {
                    data = await fetchWMSData(params, {
                        style: metadata.style,
                        event,
                    })
                }
                
                if (data?.features?.length) {
                    await normalizeGeoJSON(data)
                    features = [
                        ...features,
                        ...(data.features ?? [])
                    ]
                }
            }
        }

        if (features?.length && features.length > 1) {
            const uniqueFeatures = []
            features.forEach(f1 => {
                if (!uniqueFeatures.find(f2 => {
                    if (f1.source !== f2.source) return false
                    if (f1.layer?.metadata?.name !== f2.layer?.metadata?.name) return false
                    if (f1.layer?.metadata?.group !== f2.layer?.metadata?.group) return false
                    if (!featuresAreSimilar(f1, f2)) return false
                    return true
                })) uniqueFeatures.push(f1)
            })
            features = uniqueFeatures
        }

        return features
    }
    
    getLayerTitle(layer) {
        if (!layer) return
        const source = this.map.getSource(layer.source)
        return layer.metadata?.params?.title ?? layer.metadata?.params?.name ?? source?.metadata?.params?.title ?? source?.metadata?.params?.name
    }

    removeGeoJSONLayers(layerPrefix) {
        this.map.getStyle().layers?.forEach(l => {
            if (!l.id.startsWith(layerPrefix)) return
            this.map.removeLayer(l.id)
        })
    }
    
    getBeforeId(layerPrefix, beforeId) {
        let fixedLayers = structuredClone(this.config.fixedLayers)

        const layerMatch = fixedLayers.find(i => layerPrefix.startsWith(i))
        if (layerMatch) {
            const idx = fixedLayers.indexOf(layerMatch)
            fixedLayers = fixedLayers.splice(idx + 1)
        }

        return this.map.getStyle().layers?.find(l => l.id.startsWith(beforeId) || fixedLayers.find(i => l.id.startsWith(i)))?.id 
    }
    
    moveGeoJSONLayers(layerPrefix, {
        beforeId,
    }={}) {
        const layers = this.map.getStyle().layers ?? []
        beforeId = this.getBeforeId(layerPrefix, beforeId)

        layers.forEach(l => {
            if (!l.id.startsWith(layerPrefix)) return
            this.map.moveLayer(l.id, beforeId)
        })
    }
    
    getLayerParams({
        filter,
        color=generateRandomColor(),
        minzoom=0,
        maxzoom=24,
        visibility='visible',
        customParams,
    }={}) {
        const validFilter = [filter].filter(i => i)
        const polygonFilter = ["all", ["==", "$type", "Polygon"], ...validFilter]
        const lineFilter = ["all", ["==", "$type", "LineString"], ...validFilter]
        const pointFilter = ["all", ["==", "$type", "Point"], ...validFilter]
        
        const colorHSLA = manageHSLAColor(color)
        const outlineColor = colorHSLA.toString({l:colorHSLA.l*0.5})

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
            },
            'fill': {
                minzoom,
                maxzoom,
                filter: polygonFilter,
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
                }
            },
            'line': {
                minzoom,
                maxzoom,
                filter: lineFilter,
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
                }
            },
            'circle': {
                minzoom,
                maxzoom,
                filter: pointFilter,
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
            },
            'heatmap': {
                minzoom,
                maxzoom,
                filter: pointFilter,
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
            },
            'fill-extrusion': {
                minzoom,
                maxzoom,
                filter: polygonFilter,
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
            },
            'symbol': {
                minzoom,
                maxzoom,
                filter: pointFilter,
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
                }
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
                        filter: polygonFilter,
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
                        filter: lineFilter,
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
                        filter: lineFilter,
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
                        filter: ["any", pointFilter, lineFilter, polygonFilter],
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
                            }
                        }
                    }
                })
            })
        }

        return params
    }
    
    updateGeoJSONLayer(id, params) {
        const map = this.map

        Object.entries(params.layout ?? {}).forEach(([prop, val]) => {
            map.setLayoutProperty(id, prop, val)
        })

        Object.entries(params.paint ?? {}).forEach(([prop, val]) => {
            map.setPaintProperty(id, prop, val)
        })

        if (params.filter) {
            map.setFilter(id, params.filter)
        }

        if (params.minzoom && params.maxzoom) {
            map.setLayerZoomRange(id, params.minzoom, params.maxzoom)
        }

        const layer = map.getLayer(id)

        Object.entries(params.metadata ?? {}).forEach(([prop, val]) => {
            layer.metadata[prop] = val
        })

        return layer
    }

    addGeoJSONLayers(sourceId, {
        name=generateRandomString(),
        groups,
        beforeId,
    }={}) {
        const map = this.map
        const source = map.getSource(sourceId)
        if (!source) return
        
        const layerPrefix = `${sourceId}-${name}`
        beforeId = this.getBeforeId(layerPrefix, beforeId)

        groups = groups ?? { default: this.getLayerParams() }
        
        Object.keys(groups).forEach(groupId => {
            const group = groups[groupId]
            Object.keys(group).forEach(type => {
                const typeLayers = group[type]
                Object.keys(typeLayers).forEach(role => {
                    if (!typeLayers[role].render) return

                    const id = Array(layerPrefix, groupId, type, role).join('-')
                    
                    const layerParams = {
                        ...typeLayers[role].params,
                        id,
                        type,
                        source: sourceId,
                        metadata: {
                            ...source.metadata,
                            ...typeLayers[role].params.metadata,
                            groups,
                            group: groupId,
                            name,
                            role,
                            tooltip: {
                                active: true
                            },
                            popup: {
                                active: true
                            },
                        },
                    }

                    if (this.map.getLayer(id)) {
                        this.updateGeoJSONLayer(id, layerParams)
                    } else {
                        this.map.addLayer(layerParams, beforeId)
                    }
                })
            })
        })

        return this.map.getStyle().layers.filter(l => l.id.startsWith(layerPrefix))
    }

    async addWMSLayer(sourcePrefix, params, {
        style
    } = {}) {
        const map = this.map
        
        const styleOptions = JSON.parse(params.styles ?? '{}')
        if (!style || !(style in styleOptions)) {
            for (const i in styleOptions) {
                style = i
                if (style) break
            }
        }

        const sourceId = Array(sourcePrefix, style).join('-')

        let source = map.getSource(sourceId)
        if (!source) {
            const getParams = {
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
                ...(style ? {STYLES: style} : {})
            }

            const url = decodeURIComponent(pushQueryParamsToURLString(removeQueryParams(params.url), getParams))

            map.addSource(sourceId, {
                type: "raster",
                tiles: [url],
                tileSize: 256,
            })

            source = map.getSource(sourceId)
            source.metadata = {params, style}
        }
     
        if (source) {
            const id = `${sourceId}-${generateRandomString()}`
            const beforeId = this.getBeforeId(id)

            map.addLayer({
                id,
                type: "raster",
                source: sourceId,
                metadata: {
                    ...source.metadata,
                    params: {
                        ...source.metadata.params,
                        ...params,
                    },
                    name: generateRandomString(),
                    popup: {
                        active: true,
                    }
                }
            }, beforeId)   
        }
    }

    addXYZLayer (sourcePrefix, params) {
        const map = this.map
        
        const sourceId = sourcePrefix

        let source = map.getSource(sourceId)
        if (!source) {
            let url = decodeURIComponent(params.url)
            if (!url.includes('{x}')) {
                let [href,z,x,y] = url.split('{', 4)
                if (z.split('}',2)[0] !== 'z') z = ['z', z.split('}',2)[1]].filter(i => i).join('}')
                if (x.split('}',2)[0] !== 'x') x = ['x', x.split('}',2)[1]].filter(i => i).join('}')
                if (y.split('}',2)[0] !== 'y') y = ['y', y.split('}',2)[1]].filter(i => i).join('}')
                url = [href,z,x,y].join('{')
            }

            map.addSource(sourceId, {
                tileSize: 256,
                type: "raster",
                tiles: [url],
            })

            source = map.getSource(sourceId)
            source.metadata = {params}
        }
     
        if (source) {
            const id = `${sourceId}-${generateRandomString()}`
            const beforeId = this.getBeforeId(id)

            map.addLayer({
                id,
                type: "raster",
                source: sourceId,
                metadata: {
                    ...source.metadata,
                    params: {
                        ...source.metadata.params,
                        ...params,
                    },
                    name: generateRandomString(),
                    popup: {
                        active: false,
                    }
                }
            }, beforeId)   
        }
    }

    async addLayerFromParams(params) {
        console.log(params)

        const sourcePrefix = Array(params.type, await hashJSON({
            url:params.url,
            format:params.format,
            name:params.name,
        })).join('-')

        if (params.type === 'wms') {
            this.addWMSLayer(sourcePrefix, params)
        }

        if (params.type === 'xyz') {
            this.addXYZLayer(sourcePrefix, params)
        }
    }

    getLayerBbox(layer) {
        let bbox = layer.metadata?.params.bbox

        if (!bbox) {
            console.log(`there is no bbox in metadata`)
        }

        return bbox
    }


    // FEATURE METHODS
    getDefaultFeatureLabel(f) {
        return f.properties[
            this.config.nameProperties
            .find(i => Object.keys(f.properties).find(j => j.includes(i))) 
            ?? Object.keys(f.properties).pop()
        ]  
    }

    featurePropertiesToTable(properties, {
        parent,
        tableClass = '',
        containerClass = '',
    } = {}) {
        const container = customCreateElement({
            parent, 
            className: `${containerClass}`,
        })

        const table = customCreateElement({
            tag: 'table',
            className: `table ${tableClass}`,
            parent: container,
        })

        const tbody = customCreateElement({
            tag: 'tbody',
            parent: table,
        })
        
        Object.keys(properties).forEach(property => {
            const data = properties[property] ?? null

            const tr = customCreateElement({
                tag: 'tr',
                parent: tbody
            })
            
            const key = customCreateElement({
                tag: 'td',
                parent: tr,
                className: `fw-medium pe-3`,
                innerText: property,
                attrs: {'scope': 'row'},
            })
            
            const value = customCreateElement({
                tag: 'td',
                parent: tr,
                className: 'text-wrap',
                style: {maxWidth: `${window.innerWidth * 0.25}px`},
                innerHTML: data   
            })
        })

        return container
    }
    

    // POPUP HANDLERS
    async togglePopupFeature(feature, {toggle}={}) {
        const popupFeature = this.config.popup.feature
        const popupToggle = this.config.popup.toggle
        
        const toggleOff = popupFeature && featuresAreSimilar(popupFeature, feature)
        const sourceId = 'popupFeature'
        
        if (toggleOff) {
            this.config.popup.feature = null
            this.resetGeoJSONSource(sourceId)
        } else {
            this.config.popup.feature = feature
            this.map.fitBounds(feature.bbox ?? turf.bbox(feature), {padding:100, maxZoom:11})
            await this.setGeoJSONData(sourceId, {data: turf.featureCollection([feature])})

            const color = `hsla(180, 100%, 50%, 1.00)`
            this.addGeoJSONLayers(sourceId, {
                name: 'default',
                groups:  {
                    default: this.getLayerParams({
                        color,
                        customParams: {
                            'fill' : {
                                'polygons': {
                                    render: true,
                                    params: {
                                        paint: {
                                            "fill-color": manageHSLAColor(color).toString({a:0})
                                        }
                                    },
                                },
                            },
                            'line': {
                                'polygon-outlines': {
                                    render: true,
                                    params: {
                                        paint: {
                                            'line-color': color,
                                        },
                                    }
                                }
                            },
                        }
                    }
                )}
            })
        }

        if (popupToggle) {
            popupToggle.classList.add('text-bg-secondary')
            popupToggle.classList.remove('text-bg-info')
            this.config.popup.toggle = null
        }

        if (toggle) {
            toggle.classList.toggle('text-bg-secondary', toggleOff)
            toggle.classList.toggle('text-bg-info', !toggleOff)
            this.config.popup.toggle = !toggleOff ? toggle : null;;
        }

        return !toggleOff
    }

    configPopupTooltip(popup, {
        darkColor,
        lightColor,
    }={}) {
        const popupContainer = popup._container
        const popupTooltip = popupContainer.querySelector('.maplibregl-popup-tip')
        
        const handler = () => {
            popupTooltip.removeAttribute('style')
            const style = window.getComputedStyle(popupTooltip)
            Array('Top', 'Bottom', 'Left', 'Right').forEach(pos => {
                const lowerPos = pos.toLowerCase()
                if (style.getPropertyValue(`border-${lowerPos}-color`) === `rgb(255, 255, 255)`) {
                    popupTooltip.style[`border${pos}Color`] = (
                        getPreferredTheme() === 'dark' 
                        ? darkColor ?? `rgba(var(--bs-dark-rgb)` 
                        : lightColor ?? `rgba(var(--bs-light-rgb)`
                    )
                }
            })
        }

        handler()
        const mutationObserver = elementMutationObserver(popupContainer, handler, {
            attributesFilter: ['class'], timeout: 0,
        })

        document.addEventListener('setTheme', handler)
    }
    
    async createPopup(e) { 
        const map = this.map

        const toggleSelector = `[name="popup-toggle"]`
        const popupControl = this.settings.popup

        const popupToggle = popupControl.querySelector(`input${toggleSelector}`)
        if (!popupToggle.checked) return

        const sourceId = 'popupFeature'

        let lngLat = e.lngLat

        const popupWidth = window.innerWidth * 0.75
        const popupHeight = window.innerHeight * 0.5

        const popup = this.config.popup.control = new maplibregl.Popup()
        .setLngLat(lngLat)
        .setMaxWidth(`${popupWidth}px`)
        .setHTML(`<div></div>`)
        .addTo(map)

        popup.on("close", () => {
            this.config.popup = {}
            this.resetGeoJSONSource(sourceId)
        })
        
        const popupContainer = popup._container
        this.configPopupTooltip(popup)

        const popupCloseBtn = popupContainer.querySelector('.maplibregl-popup-close-button')
        popupCloseBtn.classList.add(`text-bg-${getPreferredTheme()}`)
        
        const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
        popupContent.classList.add(`bg-${getPreferredTheme()}`)
        popupContent.style.padding = `24px 12px 12px 12px`
        
        const container = popupContent.firstChild
        container.className = `d-flex flex-column gap-3`
        // container.style.maxHeight = `${popupHeight-10-12-24}px`
        container.style.maxWidth = `${popupWidth-12-12}px`

        const footer = customCreateElement({
            parent: container,
            className: 'd-flex flex-wrap gap-2',
            style: {
                maxWidth: `${popupWidth/3}px`,
            }
        })

        const zoom = customCreateElement({
            tag: 'button',
            className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap gap-2 fs-12',
            parent: footer,
            innerText: '🔍',
            events: {
                click: (e) => {
                    map.flyTo({
                        center: Object.values(lngLat),
                        zoom: 11,
                    })
                }
            }
        })

        const coordsValues = Object.values(lngLat).map(i => i.toFixed(6))    

        const coords = customCreateElement({
            tag: 'button',
            className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap gap-2 fs-12 flex-grow-1',
            parent: footer,
            innerHTML: `<span>📋</span><span>${coordsValues[0]}</span><span>${coordsValues[1]}</span>`,
            events: {
                click: (e) => {
                    navigator.clipboard.writeText(coordsValues.join(' '))
                }
            }
        })
        
        const checkedOptions = Array.from(popupControl.querySelectorAll(`input:not(${toggleSelector})`)).filter(i => i.checked).map(i => i.getAttribute('name').split('-').pop())

        if (checkedOptions.includes('osm')) {
            const data = await fetchReverseNominatim({
                queryGeom: turf.point(Object.values(lngLat)),
                zoom: map.getZoom(),
            })
            
            if (data?.features?.length) {
                const feature = data.features[0]
                const place = customCreateElement({
                    tag: 'button',
                    className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap align-items-center gap-2 fs-12 pe-3 flex-grow-1',
                    parent: footer,
                    innerHTML: `<span>📍</span><span class="text-wrap text-break text-start">${feature.properties.display_name}</span>`,
                    events: {
                        click: async (e) => {
                            this.togglePopupFeature(feature, {toggle:place})
                        }
                    }
                })
            }
        }

        let features = []

        if (checkedOptions.includes('layers')) {
            features = (await this.getCanvasData({
                queryRasters:true, 
                event:e, 
                layers: this.map.getStyle().layers.filter(l => l.metadata?.popup?.active).map(l => l.id)
            }))?.filter(f => f.geometry && f.layer?.source !== sourceId)
            if (features?.length > 1) {
                const point = turf.point(Object.values(lngLat))
                const intersectedFeatures = features.filter(f => turf.booleanIntersects(f, point))
                if (intersectedFeatures.length) {
                    features = intersectedFeatures
                } else {
                    const polygonFeatures = features.map(f => {
                        if (f.geometry.type.includes('Polygon')) return f
                        f = turf.clone(f)
                        f.geometry = turf.buffer(f, 10, { units: "meters" }).geometry
                        return f
                    })
                    features = polygonFeatures.map(f1 => polygonFeatures.filter(f2 => turf.booleanIntersects(f1, f2))).reduce((a, b) => (b.length > a.length ? b : a))
                    if (features.length > 1) {
                        try {
                            const intersection = turf.intersect(turf.featureCollection(features))
                            lngLat = new maplibregl.LngLat(...turf.pointOnFeature(intersection).geometry.coordinates)
                        } catch (error) {console.log(error)}
                    }
                }
            }
        }

        if (features?.length === 1) {
            lngLat = new maplibregl.LngLat(...turf.pointOnFeature(features[0]).geometry.coordinates)
        }

        popup.setLngLat(lngLat)
        
        if (features?.length) {
            const carouselContainer = customCreateElement({
                className: 'd-flex',
                style: {maxWidth: `400px`,}
                // className: 'd-flex overflow-auto pe-1'
            })
            container.insertBefore(carouselContainer, footer)

            const resizeObserver = elementResizeObserver(carouselContainer, (e) => {
                footer.style.maxWidth = `${carouselContainer.offsetWidth}px`
            })
            popup.on('close', () => resizeObserver.unobserve(carouselContainer))

            const carousel = customCreateElement({
                className: 'carousel slide flex-grow-1',
            })

            const carouselInner = customCreateElement({
                parent: carousel,
                className: 'carousel-inner'
            })

            console.log('exlude features with no properties and header')
            Object.entries(features).forEach(([i, f]) => {

                const carouselItem = customCreateElement({
                    parent: carouselInner,
                    className: `carousel-item ${parseInt(i) === 0 ? 'active' : ''}`,
                })

                const content = customCreateElement({
                    parent: carouselItem,
                    className: `d-flex flex-column gap-2`,
                    style: {maxHeight: `50vh`}
                })

                const menu = customCreateElement({
                    parent: content,
                    className: 'd-flex flex-nowrap justify-content-between'
                })

                const page = customCreateElement({
                    tag: 'span',
                    className: `fs-12 btn btn-sm text-bg-secondary rounded-pill badge pe-none`,
                    style: {zIndex: 1000},
                    parent: menu,
                    innerText: `${Array(Number(i)+1,features.length).join('/')}`,
                })

                const place = customCreateElement({
                    tag: 'button',
                    className: 'btn btn-sm text-bg-secondary rounded-pill badge fs-12',
                    style: {zIndex: 1000},
                    parent: menu,
                    innerText: '👁️',
                    events: {
                        click: async (e) => {
                            this.togglePopupFeature(turf.feature(f.geometry, f.properties), {toggle:place})
                        }
                    }
                })

                let tempHeader = null
                // tempHeader = '<img width="400" src="https://th.bing.com/th/id/OSK.HEROlJnsXcA4gu9_6AQ2NKHnHukTiry1AIf99BWEqfbU29E?w=472&h=280&c=1&rs=2&o=6&pid=SANGAM">'
                
                const header = customCreateElement({
                    parent: content,
                    className: `fw-bold text-break text-wrap text-start fs-14`,
                    style: {maxWidth:`400px`},
                    innerHTML: tempHeader ?? Array(
                        this.getLayerTitle(f.layer),
                        this.getTooltipContent(f)
                    ).filter(i => i).join(': ')
                })

                const propertiesTable = this.featurePropertiesToTable(f.properties, {
                    parent: content, 
                    tableClass: `table-sm table-striped m-0 fs-12 table-${getPreferredTheme()}`,
                    containerClass: `overflow-y-auto flex-grow-1`,
                })

            })
            
            if (features.length > 1) {
                Array.from(customCreateElement({
                    innerHTML: `
                        <button class="carousel-control-prev w-auto h-auto mt-2" type="button" data-bs-target="#${carousel.id}" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next w-auto h-auto me-2" type="button" data-bs-target="#${carousel.id}" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    `
                }).children).forEach(b => carousel.appendChild(b))
            }

            carouselContainer.appendChild(carousel)

            this.handleMetadataSources(popupContainer)
        }
    }

    configPopup() {
        this.map.on('click', (e) => {
            this.createPopup(e)
        })
    }


    // TOOLTIP HANDLERS
    getTooltipContent(f) {
        const tooltip = f.layer?.metadata?.tooltip ?? {}

        return Array(
            tooltip.prefix ?? '',
            tooltip.properties?.map(p => String(f.properties?.[p]) ?? 'null').join(tooltip.delimiter ?? '') ?? '',
            tooltip.suffix ?? '',
        ).join('').trim() || this.getDefaultFeatureLabel(f)
    }

    async createTooltip(e) {
        const map = this.map
        
        if (!this.config.showTooltip) return

        const validVectorLayers = map.getStyle().layers.filter(l => {
            return (
                this.config.vectorLayerTypes.includes(l.type)
                && l.metadata?.tooltip?.active
                && map.getStyle().sources[l.source]?.data?.features?.length
            )
        })
        if (!validVectorLayers.length) return

        const features = await this.getCanvasData({event:e, layers: validVectorLayers.map(l => l.id)})
        if (!features?.length) return

        let label
        for (const f of features) {
            label = this.getTooltipContent(f)
            if (label) break
        }

        if (!label) return

        const popup = this.config.tooltip = new maplibregl.Popup({closeButton: false})
        .setLngLat(e.lngLat)
        .setHTML(`<span class="text-break">${label}</span>`)
        .addTo(map)

        const popupContainer = popup._container

        this.configPopupTooltip(popup, {
            darkColor: 'hsla(0, 0%, 0%, 0.5)',
            lightColor: 'hsla(0, 0%, 100%, 0.5)',
        })

        const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
        popupContent.classList.add('p-2')
        popupContent.style.backgroundColor = getPreferredTheme() === 'light' ? 'hsla(0, 0%, 100%, 0.5)' : 'hsla(0, 0%, 0%, 0.5)'

        const container = popupContent.firstChild
        container.style.color = getPreferredTheme() === 'light' ? 'hsla(0, 0%, 0%, 1)' : 'hsla(0, 0%, 100%, 1)'
    }

    configTooltip() {
        this.map.on('mousemove', (e) => {
            this.config.tooltip?.remove()
            this.config.tooltip = null
            
            clearTimeout(this.config.tooltipTimeout)
            this.config.tooltipTimeout = setTimeout(async () => {
                this.createTooltip(e)
            }, 100);
        })
    }

  

    onAdd(map) {
        this.map = map

        this.setPlaceSearchControl()
        this.setNavControl()
        this.setTerrainControl()
        this.setGeolocateControl()
        this.setFitToWorldControl()
        this.setUserControl()
        this.setLegendControl()
        this.setScaleControl()
        this.setFullscreenControl()
        this.configAttributionControl()

        this.configPopup()
        this.configTooltip()

        this.handleMetadataSources(this.map.getContainer())
        this.handleBboxSources(this.map.getContainer())

        this.configBboxFields()
        this.handleHTMXContent()

        this.configMapAddLayer()
        this.configRemoveLayer()

        this.createSettingsControl()
        this.map._settingsControl = this

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container)
        this.map = undefined
    }
}