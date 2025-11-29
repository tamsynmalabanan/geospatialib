class GeospatialibControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
        
        this.controls = null
        this.config = {
            renderHillshade: true,
            projection: 'mercator',
            popup: {}
        }

        this.handlers = {
            setGeolocateControl: ({
                position='top-left',
            }={}) => {
                const control = new maplibregl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true
                    },
                    trackUserLocation: true,
                    showUserHeading: true,
                });
                this.map.addControl(control, position)
            },
            setNavControl: ({
                visualizePitch=true,
                showZoom=true,
                showCompass=true,
                position='top-left',
            }={}) => {
                const control = new maplibregl.NavigationControl({
                    visualizePitch,
                    showZoom,
                    showCompass,
                })
                this.map.addControl(control, position)
            },
            setScaleControl: ({
                unit='metric',
                maxWidth=200,
                position='bottom-right',
            }={}) => {
                const control = new maplibregl.ScaleControl({
                    maxWidth,
                    unit,
                })
                this.map.addControl(control, position)
            },
            setTerrainControl: ({
                source='terrain',
                exaggeration=1,
                position='top-left',
            }={}) => {
                const map = this.map
                if (!map.getSource(source)) return

                const control = new maplibregl.TerrainControl({
                    source,
                    exaggeration,
                })
                map.addControl(control, position)
                map.setTerrain(null)

                control._container.querySelector('button').addEventListener('click', this.handlers.toggleHillshade)
            },
            setPlaceSearchControl: ({
                position='top-left',
            }={}) => {
                const control = new PlaceSearchControl()
                this.map.addControl(control, position)
            },
            setFitToWorldControl: ({
                position='top-left',
            }={}) => {
                const control = new FitToWorldControl()
                this.map.addControl(control, position)
            },

            setTerrainSource: ({
                source = 'terrain',
                exaggeration = 1,
            } = {}) => {
                if (!this.map.getSource(source)) return
                this.map.setTerrain({ source, exaggeration })
            },
            toggleHillshade: () => {
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
            },
            setProjection: ({type='mercator'}={}) => {
                if (!type) type = 'mercator'
                this.map.setProjection({type})
                this.config.projection = type
            },
            getProjection: () => {
                return this.config.projection
            },
            togglePopupFeature: (feature, {toggle}={}) => {
                const popupFeature = this.config.popup.feature
                const popupToggle = this.config.popup.toggle
                
                const toggleOff = popupFeature && featuresAreSimilar(popupFeature, feature)
                const sourceId = 'popupFeature'
                
                if (toggleOff) {
                    this.config.popup.feature = null
                    this.handlers.resetGeoJSONSource(sourceId)
                } else {
                    this.config.popup.feature = feature
                    this.map.fitBounds(feature.bbox ?? turf.bbox(feature))
                    this.handlers.setGeoJSONData(sourceId, {data: turf.featureCollection([feature])})
                    this.handlers.addGeoJSONLayers(sourceId)
                }

                if (popupToggle) {
                    popupToggle.classList.add('text-bg-secondary')
                    popupToggle.classList.remove('text-bg-primary')
                    this.config.popup.toggle = null
                }

                if (toggle) {
                    toggle.classList.toggle('text-bg-secondary', toggleOff)
                    toggle.classList.toggle('text-bg-primary', !toggleOff)
                    this.config.popup.toggle = !toggleOff ? toggle : null;;
                }

                return !toggleOff
            },
            createPopup: async (e) => {
                const map = this.map

                const toggleSelector = `[name="popup-toggle"]`
                const popupControl = this.controls.popup

                const popupToggle = popupControl.querySelector(`input${toggleSelector}`)
                if (!popupToggle.checked) return

                const checkedOptions = Array.from(popupControl.querySelectorAll(`input:not(${toggleSelector})`)).filter(i => i.checked).map(i => i.getAttribute('name').split('-').pop())
                if (!checkedOptions.length) return

                const sourceId = 'popupFeature'

                let features = []
                let lngLat = e.lngLat

                if (checkedOptions.includes('layers')) {
                    features = map.queryRenderedFeatures(e.point)
                    console.log('update features with features from wms layers, etc.')
                    
                    features = features.filter(f => {
                        return turf.booleanValid(f) && f.layer.source !== sourceId
                    })
                    
                    if (features.length > 1) {
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

                if (features.length === 1) {
                    lngLat = new maplibregl.LngLat(...turf.pointOnFeature(features[0]).geometry.coordinates)
                }

                const popupWidth = window.innerWidth * 0.5
                const popupHeight = window.innerHeight * 0.5

                const popup = this.config.popup.control = new maplibregl.Popup()
                .setLngLat(lngLat)
                .setMaxWidth(`${popupWidth}px`)
                .setHTML(`<div></div>`)
                .addTo(map)

                popup.on("close", () => {
                    this.config.popup = {}
                    this.handlers.resetGeoJSONSource(sourceId)
                })
                
                const popupContainer = popup._container
                
                const popupTooltip = popupContainer.querySelector('.maplibregl-popup-tip')
                popupTooltip.classList.add(`border-top-${getPreferredTheme()}`, `border-bottom-${getPreferredTheme()}`)
                
                const popupCloseBtn = popupContainer.querySelector('.maplibregl-popup-close-button')
                popupCloseBtn.classList.add(`text-bg-${getPreferredTheme()}`)
                
                const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
                popupContent.classList.add(`bg-${getPreferredTheme()}`)
                popupContent.style.padding = `24px 12px 12px 12px`
                
                const container = popupContent.firstChild
                container.className = `d-flex flex-column gap-3`
                container.style.maxHeight = `${popupHeight-10-12-24}px`
                container.style.maxWidth = `${popupWidth-12-12}px`
                
                if (features.length) {
                    const carouselContainer = customCreateElement({
                        parent: container,
                        className: 'd-flex overflow-auto'
                    })

                    const resizeObserver = elementResizeObserver(carouselContainer, (e) => {
                        footer.style.maxWidth = carouselContainer.offsetWidth
                    })
                    popup.on('close', () => resizeObserver.unobserve(carouselContainer))

                    const carousel = customCreateElement({
                        parent: carouselContainer,
                        className: 'carousel slide',
                    })

                    const carouselInner = customCreateElement({
                        parent: carousel,
                        className: 'carousel-inner'
                    })

                    Object.keys(features).forEach(i => {
                        const f = features[i]
                        
                        const carouselItem = customCreateElement({
                            parent: carouselInner,
                            className: `carousel-item ${parseInt(i) === 0 ? 'active' : ''}`,
                        })
                        
                        const tempHeader = '<img src="https://th.bing.com/th/id/OSK.HEROlJnsXcA4gu9_6AQ2NKHnHukTiry1AIf99BWEqfbU29E?w=472&h=280&c=1&rs=2&o=6&pid=SANGAM">'
                        const propertiesTable = createFeaturePropertiesTable(f.properties, {
                            parent: carouselItem, 
                            header: tempHeader ?? Array(
                                f.layer.metadata.title ?? map.getSource(f.layer.source).metadata.title,
                                f.properties[
                                    Array('display_name', 'name', 'title', 'id')
                                    .find(i => Object.keys(f.properties).find(j => j.includes(i))) 
                                    ?? Object.keys(f.properties).pop()
                                ]
                            ).filter(i => i).join(': '), 
                            tableClass: `fs-12 table-${getPreferredTheme()}`
                        })

                        const place = customCreateElement({
                            tag: 'button',
                            className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap gap-2 fs-12 position-absolute top-0 end-0 m-2',
                            parent: carouselItem,
                            innerText: '👁️',
                            events: {
                                click: async (e) => {
                                    this.handlers.togglePopupFeature(turf.feature(f.geometry, f.properties), {toggle:place})
                                }
                            }
                        })
                    })
                    
                    if (features.length > 1) {
                        Array.from(customCreateElement({
                            innerHTML: `
                                <button class="carousel-control-prev" type="button" data-bs-target="#${carousel.id}" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                    <span class="visually-hidden">Previous</span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#${carousel.id}" data-bs-slide="next">
                                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                    <span class="visually-hidden">Next</span>
                                </button>
                            `
                        }).children).forEach(b => carousel.appendChild(b))
                    }
                }

                const footer = customCreateElement({
                    parent: container,
                    className: 'd-flex flex-wrap gap-2',
                    style: {
                        maxWidth: `${popupWidth/2}px`,
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

                if (checkedOptions.includes('coords')) {
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
                }
                
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
                                    this.handlers.togglePopupFeature(feature, {toggle:place})
                                }
                            }
                        })
                    }
                }
            },

            resetGeoJSONSource: (sourceId) => {
                const source = this.map.getSource(sourceId)
                if (!source) return

                this.handlers.removeGeoJSONLayers(sourceId)
                this.handlers.setGeoJSONData(sourceId)
            },
            setGeoJSONData: (sourceId, {
                data=turf.featureCollection([]),
                metadata,
                attribution,
            }={}) => {
                const map = this.map
                console.log('normalize geojson data')

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
                        attribution: attribution ?? metadata.attribution ?? data[Object.keys(data).find(i => Array(
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
            },
            removeGeoJSONLayers: (layerPrefix) => {
                this.map.getStyle().layers?.forEach(l => {
                    if (!l.id.startsWith(layerPrefix)) return
                    this.map.removeLayer(l.id)
                })
            },
            getBeforeId: (layerPrefix, beforeId) => {
                let fixedLayers = [
                    'popupFeature', 
                    'placeSearch',
                ]

                const layerMatch = fixedLayers.find(i => layerPrefix.startsWith(i))
                if (layerMatch) {
                    const idx = fixedLayers.indexOf(layerMatch)
                    fixedLayers = fixedLayers.splice(idx + 1)
                }

                return this.map.getStyle().layers?.find(l => l.id.startsWith(beforeId) || fixedLayers.find(i => l.id.startsWith(i)))?.id 
            },
            moveGeoJSONLayers: (layerPrefix, {
                beforeId,
            }={}) => {
                const layers = this.map.getStyle().layers ?? []
                beforeId = this.handlers.getBeforeId(layerPrefix, beforeId)

                layers.forEach(l => {
                    if (!l.id.startsWith(layerPrefix)) return
                    this.map.moveLayer(l.id, beforeId)
                })
            },
            getLayerParams: ({
                color=generateRandomColor(),
                symbolAlongLines=false,
                polygonShadows=false,
                polygonOutlines=true,
                pointShadows=false,
                lineShadows=false,
                polygonShadowTranslate=[-10,-10],
            }={}) => {
                const hslaColor = manageHSLAColor(color)
                const outlineColor = hslaColor.toString({l:hslaColor.l/2})

                const defaultLayout = {
                    visibility: 'visible', //none
                }

                const defaultPaint = {

                }

                const types = {
                    'background': {
                        main: { 
                            render: false,
                            layout: {
                                ...defaultLayout,
                            },
                            paint: {
                                ...defaultPaint,
                                'background-color': color,
                                // 'background-pattern': '',
                                'background-opacity': 0.5,
                            },
                        }, 
                    },

                    // polygons
                    'fill-extrusion': {
                        polygonShadows: {
                            render: polygonShadows,
                            filter: ["==", "$type", "Polygon"],
                            layout: {
                                ...defaultLayout,
                            },
                            paint: {
                                ...defaultPaint,
                                'fill-extrusion-opacity': 1,
                                'fill-extrusion-color': color,
                                'fill-extrusion-translate': [-10,-10],
                                'fill-extrusion-translate-anchor': 'map',
                                // 'fill-extrusion-pattern': '',
                                'fill-extrusion-height': 0,
                                'fill-extrusion-base': 0,
                                'fill-extrusion-vertical-gradient': true,
                            },
                        },
                        polygons: {
                            render: false,
                            filter: ["==", "$type", "Polygon"],
                            layout: {
                                ...defaultLayout,
                            },
                            paint: {
                                ...defaultPaint,
                                'fill-extrusion-opacity': 1,
                                'fill-extrusion-color': color,
                                'fill-extrusion-translate': [0,0],
                                'fill-extrusion-translate-anchor': 'map',
                                // 'fill-extrusion-pattern': '',
                                'fill-extrusion-height': 0,
                                'fill-extrusion-base': 0,
                                'fill-extrusion-vertical-gradient': true,
                            },
                        },
                    },
                    'fill': {
                        polygonShadows: {
                            render: polygonShadows,
                            filter: ["==", "$type", "Polygon"],
                            layout: {
                                ...defaultLayout,
                                'fill-sort-key': 0, // like z-index
                            },
                            paint: {
                                ...defaultPaint,
                                'fill-color': color,
                                'fill-opacity': 0.5,
                                'fill-outline-color': hslaColor.toString({l:hslaColor.l/2}),
                                'fill-antialias': true,
                                'fill-translate': polygonShadowTranslate,
                                'fill-translate-anchor': 'map', // viewport
                                'fill-pattern': '',
                            }
                        },
                        polygons: {
                            render: true,
                            filter: ["==", "$type", "Polygon"],
                            layout: {
                                ...defaultLayout,
                                'fill-sort-key': 0, // like z-index
                            },
                            paint: {
                                ...defaultPaint,
                                'fill-color': color,
                                'fill-opacity': 0.5,
                                'fill-outline-color': outlineColor,
                                'fill-antialias': true,
                                'fill-translate': [0,0],
                                'fill-translate-anchor': 'map', // viewport
                                // 'fill-pattern': '',
                            }
                        },
                    },
                    
                    // lines
                    'line': {
                        polygonOutlines: {
                            render: polygonOutlines,
                            filter: ["==", "$type", "Polygon"],
                            layout: {
                                ...defaultLayout,
                                'line-cap': 'butt',
                                'line-join': 'miter',
                               'line-miter-limit': 2,
                               'line-round-limit': 1.05,
                               'line-sort-key': 0,
                            },
                            paint: {
                                ...defaultPaint,
                                'line-color': color,
                                'line-width': 3,
                                'line-opacity': 1,
                                'line-translate': [0,0],
                                'line-translate-anchor': 'map',
                                'line-gap-width': 0,
                                'line-offset': 0,
                                'line-blur': 0,
                                // 'line-dasharray': [],
                                // 'line-pattern': '',
                                // 'line-gradient': '',
                            }
                        },
                        lineShadows: {
                           render: lineShadows,
                           filter: ["==", "$type", "LineString"],
                           layout: {
                               ...defaultLayout,
                               'line-cap': 'butt',
                               'line-join': 'miter',
                               'line-miter-limit': 2,
                               'line-round-limit': 1.05,
                               'line-sort-key': 0,
                           },
                           paint: {
                               ...defaultPaint,
                               'line-color': color,
                               'line-width': 3,
                               'line-opacity': 1,
                               'line-translate': [-10,-10],
                               'line-translate-anchor': 'map',
                               'line-gap-width': 0,
                               'line-offset': 0,
                               'line-blur': 0,
                               // 'line-dasharray': [],
                               // 'line-pattern': '',
                               // 'line-gradient': '',
                            }
                        },
                        lines: {
                            render: true,
                            filter: ["==", "$type", "LineString"],
                            layout: {
                                ...defaultLayout,
                                'line-cap': 'butt',
                                'line-join': 'miter',
                                'line-miter-limit': 2,
                                'line-round-limit': 1.05,
                                'line-sort-key': 0,
                            },
                            paint: {
                                ...defaultPaint,
                                'line-color': color,
                                'line-width': 3,
                                'line-opacity': 1,
                                'line-translate': [0,0],
                                'line-translate-anchor': 'map',
                                'line-gap-width': 0,
                                'line-offset': 0,
                                'line-blur': 0,
                                // 'line-dasharray': [],
                                // 'line-pattern': '',
                                // 'line-gradient': '',
                           }
                       },
                    },
                    
                    // points
                    'circle': {
                        pointShadows: {
                            render: pointShadows,
                            filter: ["==", "$type", "Point"],
                            layout: {
                                ...defaultLayout,
                                'circle-sort-key': 0,
                            },
                            paint: {
                                ...defaultPaint,
                                "circle-radius": 6, 
                                "circle-color": color,
                                "circle-blur": 0, // 0-1
                                "circle-opacity": 1, // 0-1
                                "circle-translate": [-10,-10],
                                "circle-translate-anchor": 'map',
                                "circle-pitch-scale": 'map',
                                "circle-pitch-alignment": 'viewport',
                                "circle-stroke-width": 1,
                                "circle-stroke-color": outlineColor,
                                "circle-stroke-opacity": 1,
                            },
                        },
                        points: {
                            render: false,
                            filter: ["==", "$type", "Point"],
                            layout: {
                                ...defaultLayout,
                                'circle-sort-key': 0,
                            },
                            paint: {
                                ...defaultPaint,
                                "circle-radius": 6, 
                                "circle-color": color,
                                "circle-blur": 0, // 0-1
                                "circle-opacity": 1, // 0-1
                                "circle-translate": [0,0],
                                "circle-translate-anchor": 'map',
                                "circle-pitch-scale": 'map',
                                "circle-pitch-alignment": 'viewport',
                                "circle-stroke-width": 1,
                                "circle-stroke-color": outlineColor,
                                "circle-stroke-opacity": 1,
                            },
                        },
                    }, 
                    'heatmap': {
                        points: {
                            render: false,
                            filter: ["==", "$type", "Point"],
                            layout: {
                                ...defaultLayout,
                            },
                            paint: {
                                ...defaultPaint,
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
                                'heatmap-opacity': 1,
                            },
                            
                        },
                    },
                    
                    // points and lines
                    'symbol': {
                        lineShadows: {
                            render: lineShadows && symbolAlongLines,
                            filter: ["==", "$type", "LineString"],
                            layout: {
                                ...defaultLayout,
                                // 'icon-image': '',
                                // 'icon-rotate': 0,
                                // 'icon-padding': [2],
                                // 'icon-keep-upright': false,
                                // 'icon-size': 1,
                                // 'icon-overlap': 'cooperative',
                                // 'icon-ignore-placement': false,
                                // 'icon-optional': false,
                                // 'icon-rotation-alignment': 'auto',
                                // 'icon-text-fit': 'width',
                                // 'icon-text-fit-padding': [0,0,0,0],
                                // 'icon-offset': [0,0],
                                // 'icon-anchor': 'center',
                                // 'icon-pitch-alignment': 'auto',
                                'icon-rotation-alignment': 'auto', // viewport, map
                                'icon-allow-overlap': false,
                                'text-field': 'test', 
                                'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                                'text-size': 12,
                                "text-allow-overlap": true,
                                // 'text-pitch-alignment': 'auto',
                                // 'text-rotation-alignment': 'auto',
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
                                'symbol-avoid-edges': false,
                                'symbol-placement': 'point',
                                'symbol-sort-key': 0,
                                'symbol-z-order': 'auto',
                                
                            },
                            paint: {
                                ...defaultPaint,
                                'text-color': color,
                                // 'text-opacity': 1,
                                // 'text-halo-color': color,
                                // 'text-halo-width': 0,
                                // 'text-halo-blur': 0,
                                // 'text-translate': [0,0],
                                // 'text-translate-anchor': 'map',
                                'icon-color': color,
                                // 'icon-opacity': 0,
                                // 'icon-color': color,
                                // 'icon-halo-color': color,
                                // 'icon-halo-width': 0,
                                // 'icon-halo-blur': 0,
                                // 'icon-translate': [0,0],
                                // 'icon-translate-anchor': 'map',
                            }
                        },
                        lines: {
                            render: symbolAlongLines,
                            filter: ["==", "$type", "LineString"],
                            layout: {
                                ...defaultLayout,
                                // 'icon-image': '',
                                // 'icon-rotate': 0,
                                // 'icon-padding': [2],
                                // 'icon-keep-upright': false,
                                // 'icon-size': 1,
                                // 'icon-overlap': 'cooperative',
                                // 'icon-ignore-placement': false,
                                // 'icon-optional': false,
                                // 'icon-rotation-alignment': 'auto',
                                // 'icon-text-fit': 'width',
                                // 'icon-text-fit-padding': [0,0,0,0],
                                // 'icon-offset': [0,0],
                                // 'icon-anchor': 'center',
                                // 'icon-pitch-alignment': 'auto',
                                'icon-rotation-alignment': 'auto', // viewport, map
                                'icon-allow-overlap': false,
                                'text-field': 'test', 
                                'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                                'text-size': 12,
                                "text-allow-overlap": true,
                                // 'text-pitch-alignment': 'auto',
                                // 'text-rotation-alignment': 'auto',
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
                                'symbol-avoid-edges': false,
                                'symbol-placement': 'point',
                                'symbol-sort-key': 0,
                                'symbol-z-order': 'auto',
                                
                            },
                            paint: {
                                ...defaultPaint,
                                'text-color': color,
                                // 'text-opacity': 1,
                                // 'text-halo-color': color,
                                // 'text-halo-width': 0,
                                // 'text-halo-blur': 0,
                                // 'text-translate': [0,0],
                                // 'text-translate-anchor': 'map',
                                'icon-color': color,
                                // 'icon-opacity': 0,
                                // 'icon-color': color,
                                // 'icon-halo-color': color,
                                // 'icon-halo-width': 0,
                                // 'icon-halo-blur': 0,
                                // 'icon-translate': [0,0],
                                // 'icon-translate-anchor': 'map',
                            }
                        },
                        pointShadows: {
                            render: pointShadows,
                            filter: ["==", "$type", "Point"],
                            layout: {
                                ...defaultLayout,
                                // 'icon-image': '',
                                // 'icon-rotate': 0,
                                // 'icon-padding': [2],
                                // 'icon-keep-upright': false,
                                // 'icon-size': 1,
                                // 'icon-overlap': 'cooperative',
                                // 'icon-ignore-placement': false,
                                // 'icon-optional': false,
                                // 'icon-rotation-alignment': 'auto',
                                // 'icon-text-fit': 'width',
                                // 'icon-text-fit-padding': [0,0,0,0],
                                // 'icon-offset': [0,0],
                                // 'icon-anchor': 'center',
                                // 'icon-pitch-alignment': 'auto',
                                'icon-rotation-alignment': 'auto', // viewport, map
                                'icon-allow-overlap': false,
                                'text-field': 'test', 
                                'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                                'text-size': 12,
                                "text-allow-overlap": true,
                                // 'text-pitch-alignment': 'auto',
                                // 'text-rotation-alignment': 'auto',
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
                                'symbol-avoid-edges': false,
                                'symbol-placement': 'point',
                                'symbol-sort-key': 0,
                                'symbol-z-order': 'auto',
                                
                            },
                            paint: {
                                ...defaultPaint,
                                'text-color': color,
                                // 'text-opacity': 1,
                                // 'text-halo-color': color,
                                // 'text-halo-width': 0,
                                // 'text-halo-blur': 0,
                                // 'text-translate': [0,0],
                                // 'text-translate-anchor': 'map',
                                'icon-color': color,
                                // 'icon-opacity': 0,
                                // 'icon-color': color,
                                // 'icon-halo-color': color,
                                // 'icon-halo-width': 0,
                                // 'icon-halo-blur': 0,
                                // 'icon-translate': [0,0],
                                // 'icon-translate-anchor': 'map',
                            }
                        },
                        points: {
                            render: true,
                            filter: ["==", "$type", "Point"],
                            layout: {
                                ...defaultLayout,
                                // 'icon-image': '',
                                // 'icon-rotate': 0,
                                // 'icon-padding': [2],
                                // 'icon-keep-upright': false,
                                // 'icon-size': 1,
                                // 'icon-overlap': 'cooperative',
                                // 'icon-ignore-placement': false,
                                // 'icon-optional': false,
                                // 'icon-rotation-alignment': 'auto',
                                // 'icon-text-fit': 'width',
                                // 'icon-text-fit-padding': [0,0,0,0],
                                // 'icon-offset': [0,0],
                                // 'icon-anchor': 'center',
                                // 'icon-pitch-alignment': 'auto',
                                'icon-rotation-alignment': 'auto', // viewport, map
                                'icon-allow-overlap': false,
                                'text-field': 'test', 
                                'text-font': ["Open Sans Regular","Arial Unicode MS Regular"],
                                'text-size': 12,
                                "text-allow-overlap": true,
                                // 'text-pitch-alignment': 'auto',
                                // 'text-rotation-alignment': 'auto',
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
                                'symbol-avoid-edges': false,
                                'symbol-placement': 'point',
                                'symbol-sort-key': 0,
                                'symbol-z-order': 'auto',
                                
                            },
                            paint: {
                                ...defaultPaint,
                                'text-color': color,
                                // 'text-opacity': 1,
                                // 'text-halo-color': color,
                                // 'text-halo-width': 0,
                                // 'text-halo-blur': 0,
                                // 'text-translate': [0,0],
                                // 'text-translate-anchor': 'map',
                                'icon-color': color,
                                // 'icon-opacity': 0,
                                // 'icon-color': color,
                                // 'icon-halo-color': color,
                                // 'icon-halo-width': 0,
                                // 'icon-halo-blur': 0,
                                // 'icon-translate': [0,0],
                                // 'icon-translate-anchor': 'map',
                            }
                        },
                    },
                }

                return {
                    types,
                    filter: [],
                    minzoom: 0,
                    maxzoom: 24,
                }
            },
            addGeoJSONLayers: (sourceId, {
                styleId='style',
                groups,
                beforeId,
            }={}) => {
                const map = this.map
                const source = map.getSource(sourceId)
                if (!source) return
                
                const layerPrefix = `${sourceId}-${styleId}`
                beforeId = this.handlers.getBeforeId(layerPrefix, beforeId)

                groups = groups ?? { default: this.handlers.getLayerParams() }
                
                Object.keys(groups).forEach(groupId => {
                    const group = groups[groupId]
                    Object.keys(group.types).forEach(type => {
                        const typeLayers = group.types[type]
                        Object.keys(typeLayers).forEach(layerName => {
                            const layerParams = typeLayers[layerName]
                            if (!layerParams?.render) return
    
                            const id = `${layerPrefix}-${groupId}-${type}-${layerName}`
                            
                            let layer = this.map.getLayer(id)
                            if (layer) {
                                Object.entries(layerParams.layout).forEach(([prop, val]) => {
                                    map.setLayoutProperty(id, prop, val)
                                })
    
                                Object.entries(layerParams.paint).forEach(([prop, val]) => {
                                    map.setPaintProperty(id, prop, val)
                                })
                            } else {
                                const properties = {
                                    id,
                                    type,
                                    source: sourceId,
                                    ...(layerParams.filter ? {filter: layerParams.filter} : {}),
                                    layout: layerParams.layout,
                                    paint: layerParams.paint,
                                    metadata: {
                                        ...source.metadata,
                                        style: styleId,
                                        group: groupId,
                                        layer: layerName,
                                    },
                                    minzoom: group.minzoom,
                                    maxzoom: group.maxzoom,
                                }
    
                                this.map.addLayer(properties, beforeId)
                                layer = this.map.getLayer(id)
                                console.log(layer, properties)
                            }
                        })
                    })
                })

                return this.map.getStyle().layers.filter(l => l.id.startsWith(layerPrefix))
            }
        }

        this.createControl = () => {
            const container = this.container = customCreateElement({className: 'maplibregl-ctrl maplibregl-ctrl-group'})

            const handlers = {
                projections: ({body, head}={}) => {
                    this.handlers.setProjection()

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
                        
                        const checked = this.handlers.getProjection() === name
                        
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
                            className: `btn btn-sm btn-light`,
                            attrs: {
                                title: params.label,
                                for: input.id,
                            },
                            innerText: params.icon,
                            events: {
                                click: (e) => {
                                    this.handlers.setProjection({type: name})
                                }
                            }
                        }))
                    })

                    return body
                },
                popup: ({body, head}={}) => {
                    this.map.getCanvas().style.cursor = 'pointer'

                    this.handlers.setGeoJSONData('popupFeature', {metadata:{title: 'Popup feature'}})

                    head.innerText = 'Popup options'

                    const options = {
                        toggle: {
                            label: 'Toggle popup',
                            icon: '💬',
                        },
                        coords: {
                            label: 'Location',
                            icon: '📍',
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
                            className: `btn btn-sm btn-light`,
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
                                        this.map.getCanvas().style.cursor = checked && inputs.some(i => i.checked) ? 'pointer' : ''

                                        if (!checked) {
                                            this.config.popup.control?.remove()
                                        } 
                                    }
                                } : {
                                    click: (e) => {
                                        const toggleSelector = '[name="popup-toggle"]'
                                        const toggle = body.querySelector(`input${toggleSelector}`)
                                        const inputs = Array.from(body.querySelectorAll(`input:not(${toggleSelector})`))

                                        this.map.getCanvas().style.cursor = toggle.checked && inputs.some(i => {
                                            if (input === i) return !i.checked
                                            return i.checked
                                        }) ? 'pointer' : ''
                                    }
                                })
                            }
                        }))
                    })

                    return body
                },
                misc: ({body, head}={}) => {
                    head.innerText = 'More options'

                    const input = customCreateElement({
                        tag: 'input',
                        parent: body,
                        attrs: {
                            type: 'checkbox',
                            name: 'hillshade',
                            checked: true
                        },
                        className: 'btn-check'
                    })
                    
                    const label = titleToTooltip(customCreateElement({
                        tag: 'label',
                        parent: body,
                        className: 'btn btn-sm btn-light',
                        attrs: {
                            title: 'Toggle hillshade',
                            for: input.id,
                        },
                        innerText: `⛰️`,
                        events: {
                            click: (e) => {
                                this.config.renderHillshade = !this.config.renderHillshade
                                this.handlers.toggleHillshade()
                            }
                        }
                    }))

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
                className: 'dropdown-menu m-1 maplibregl-ctrl maplibregl-ctrl-group'
            })

            menu.addEventListener('click', (e) => {
                e.stopPropagation()
            })

            const content = customCreateElement({
                parent: menu,
                className: 'd-flex flex-column px-2 gap-2'
            })
            
            this.controls = Object.keys(handlers).reduce((acc, name) => {
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
    }

    onAdd(map) {
        this.map = map

        this.handlers.setPlaceSearchControl()
        this.handlers.setNavControl()
        this.handlers.setTerrainControl()
        this.handlers.setGeolocateControl()
        this.handlers.setFitToWorldControl()
        
        this.handlers.setScaleControl()

        this.map.on('click', (e) => {
            this.handlers.createPopup(e)
        })
        
        this.createControl()

        this.map.getGeospatialibControl = () => this

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container)
        this.map = undefined
    }
}

class FitToWorldControl {
  onAdd(map) {
    this.map = map
    this.container = customCreateElement({className:'maplibregl-ctrl maplibregl-ctrl-group'})

    const button = customCreateElement({
        tag:'button',
        parent: this.container,
        className: 'fs-16',
        attrs: {
            type: 'button',
            title: 'Fit to world'
        },
        innerText: '🌍',
        events: {
            click: (e) => {
                this.map.fitBounds([[-180, -85], [180, 85]])
            }
        }
    })

    return this.container
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}

class PlaceSearchControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
    }

    onAdd(map) {
        this.map = map
        this.container = customCreateElement({className:'maplibregl-ctrl maplibregl-ctrl-group d-flex flex-nowrap gap-1 align-items-center'})

        const icon = customCreateElement({
            tag:'button',
            parent: this.container,
            className: 'fs-16',
            attrs: {
                type: 'button',
                tabindex: '-1',
            },
            innerText: '🔍',
            events: {
                click: (e) => {
                    this.container.classList.add('p-1')
                    collapse.classList.remove('d-none')
                    input.focus()
                }
            }
        })

        const collapse = customCreateElement({
            parent: this.container,
            className: 'd-flex flex-no-wrap gap-1 align-items-center d-none'
        })

        const input = customCreateElement({
            tag: 'input',
            parent: collapse,
            className: 'form-control form-control-sm box-shadow-none border-0 p-0 fs-12',
            attrs: {
                type: 'search',
                placeholder: 'Search a place or location',
                tabindex: '-1',
            },
            events: {
                change: async (e) => {
                    const sourceId = 'placeSearch'

                    const geospatialibControl = this.map.getGeospatialibControl()
                    geospatialibControl.handlers.resetGeoJSONSource(sourceId)
                    
                    const value = input.value.trim()
                    if (value === '') return
                    
                    let data = turf.featureCollection([])

                    const coords = isLngLatString(value)
                    if (coords) {
                        map.flyTo({
                            center: coords,
                            zoom: 11,
                        })
                        data = turf.featureCollection([turf.point(coords)])
                    } else {
                        data = await fetchSearchNominatim(value)
                        if (data?.features?.length) {
                            const bbox = (
                                data.features.length === 1 
                                ? data.features[0].bbox ?? turf.bbox(data.features[0]) 
                                : data.bbox ?? turf.bbox(data)
                            )
                            map.fitBounds(bbox, {padding:100, maxZoom:11})
                        }
                    }

                    if (data?.features?.length) {
                        await geospatialibControl.handlers.setGeoJSONData(sourceId, {
                            data, 
                            metadata: {title: 'Place search result'}
                        })
                        geospatialibControl.handlers.addGeoJSONLayers(sourceId)
                    }
                }
            }
        })

        const close = customCreateElement({
            tag:'button',
            parent: collapse,
            className: 'bi bi-backspace-fill text-secondary',
            attrs: {
                type: 'button',
                tabindex: '-1',
            },
            events: {
                click: (e) => {
                    this.container.classList.remove('p-1')
                    collapse.classList.add('d-none')
                }
            }
        })

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}

const initMapLibreMap = (el) => {
    const map = new maplibregl.Map({
        container: el.id,
        zoom: 0,
        center: [0,0],
        pitch: 0,
        hash: false,
        style: {
            version: 8,
            sources: {
                basemap: {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap Contributors',
                    maxzoom: 20
                },
                terrain: {
                    type: 'raster-dem',
                    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: 'Terrain Tiles © Mapzen, <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Registry of Open Data on AWS</a>',
                    encoding: 'terrarium' // important: AWS uses Terrarium encoding
                },
            },
            layers: [
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap'
                },
            ],
            sky: {}
        },
        maxZoom: 22,
        maxPitch: 85
    })

    map.on('style.load', () => {
        const control = new GeospatialibControl()
        map.addControl(control, 'bottom-right')
        
        console.log(map)
    })   
}