class GSLSettingsControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
        this.createDropdownMenu = () => {
            const dropdown = customCreateElement({
                parent: this.container,
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
                className: 'dropdown-menu mt-1 maplibregl-ctrl maplibregl-ctrl-group'
            })

            menu.addEventListener('click', (e) => {
                e.stopPropagation()
            })

            this.dropdownMenu = customCreateElement({
                parent: menu,
                className: 'd-flex flex-column px-2 gap-2'
            })
        }
        this.createControls = () => {
            this.controls = {}
            Object.keys(this.controlHandlers).forEach(name => {
                this.controls[name] = this.controlHandlers[name]()
            })
        }
        this.createControlSection = (title) => {
            const item = customCreateElement({
                tag: 'div',
                parent: this.dropdownMenu,
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
                innerText: title,
                className: 'fs-12 user-select-none fw-bold text-secondary'
            })
            
            item.appendChild(collapse)
            
            const container = customCreateElement({
                parent: collapse,
                className: 'd-flex flex-wrap gap-1'
            })

            return container
        },
        this.controlHandlers = {
            projections: () => {
                const container = this.createControlSection('Projection options')

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
                    const checked = this.map._gslHandlers.getProjection() === name
                    const input = customCreateElement({
                        tag: 'input',
                        parent: container,
                        attrs: {
                            type: 'radio',
                            name: 'projection',
                            ...(checked ? {checked: true} : {})
                        },
                        className: 'btn-check'
                    })
                    
                    const label = customCreateElement({
                        tag: 'label',
                        parent: container,
                        className: `btn btn-sm btn-secondary`,
                        attrs: {
                            title: params.label,
                            for: input.id,
                        },
                        innerText: params.icon,
                        events: {
                            click: (e) => {
                                this.map._gslHandlers.setProjection({type: name})
                            }
                        }
                    })

                    titleToTooltip(label)
                })

                return container
            },
            popup: () => {
                this.map.getCanvas().style.cursor = 'pointer'

                const container = this.createControlSection('Popup actions')

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
                    //     label: 'Elevation',
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
                        parent: container,
                        attrs: {
                            type: 'checkbox',
                            name: `popup-${name}`,
                            checked: true,
                        },
                        className: 'btn-check'
                    })
                    
                    const label = customCreateElement({
                        tag: 'label',
                        parent: container,
                        className: `btn btn-sm btn-secondary`,
                        attrs: {
                            title: params.label,
                            for: input.id,
                        },
                        innerText: params.icon,
                        events: {
                            ...(isToggle ? {click: (e) => {
                                const checked = !input.checked
                                
                                const toggleSelector = '[name="popup-toggle"]'
                                const inputs = Array.from(container.querySelectorAll(`input:not(${toggleSelector})`))
                                inputs.forEach(el => el.disabled = !checked)
                                this.map.getCanvas().style.cursor = checked && inputs.some(i => i.checked) ? 'pointer' : ''

                                if (!checked) {
                                    this.map._gslHandlers._popup?.remove()
                                } 
                            }} : {
                                click: (e) => {
                                    const toggleSelector = '[name="popup-toggle"]'
                                    const toggle = container.querySelector(`input${toggleSelector}`)
                                    const inputs = Array.from(container.querySelectorAll(`input:not(${toggleSelector})`))
                                    this.map.getCanvas().style.cursor = toggle.checked && inputs.some(i => {
                                        if (input === i) return !i.checked
                                        return i.checked
                                    }) ? 'pointer' : ''
                                }
                            })
                        }
                    })

                    titleToTooltip(label)
                })

                return container
            },
            misc: () => {
                const container = this.createControlSection('More options')
                const input = customCreateElement({
                    tag: 'input',
                    parent: container,
                    attrs: {
                        type: 'checkbox',
                        name: 'hillshade',
                        checked: true
                    },
                    className: 'btn-check'
                })
                
                const label = customCreateElement({
                    tag: 'label',
                    parent: container,
                    className: 'btn btn-sm btn-secondary font-monospace fs-10',
                    attrs: {
                        title: 'Toggle hillshade',
                        for: input.id,
                    },
                    innerText: `⛰️`,
                    events: {
                        click: (e) => {
                            this.map._gslHandlers._renderHillshade = !this.map._gslHandlers._renderHillshade
                            this.map._gslHandlers.toggleHillshade()
                        }
                    }
                })
                
                titleToTooltip(label)

                return container
            },
        }
    }

    onAdd(map) {
        this.map = map
        this.container = customCreateElement({className: 'maplibregl-ctrl maplibregl-ctrl-group'})
        this.createDropdownMenu()
        this.createControls()
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
  onAdd(map) {
    this.map = map
    this.container = customCreateElement({className:'maplibregl-ctrl maplibregl-ctrl-group d-flex flex-nowrap gap-1 align-items-center'})

    const sourceId = 'placeSearch'
    this.map.addSource(sourceId, {
        type: "geojson",
        data: turf.featureCollection([])
    })
    this.map.getSource(sourceId).title = 'Place search result'

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
                this.map._gslHandlers.removeGeoJSONLayers(sourceId)
                
                let geojson = turf.featureCollection([])

                const value = input.value.trim()
                if (value !== '') {
                    const coords = isLngLatString(value)
                    if (coords) {
                        map.flyTo({
                            center: coords,
                            zoom: 11,
                        })
                        geojson = turf.featureCollection([turf.point(coords)])
                    } else {
                        geojson = await fetchSearchNominatim(value)
                        if (geojson?.features.length) {
                            const bbox = turf.bbox(geojson)
                            map.fitBounds(bbox, {padding:100, maxZoom:12})
                        }
                    }
                }

                map.getSource(sourceId).setData(geojson)
                if (geojson.features.length) {
                    this.map._gslHandlers.addGeoJSONLayers(sourceId)
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

    map._gslHandlers = {
        _renderHillshade: true,
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
            map.addControl(control, position)
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
            map.addControl(control, position)
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
            map.addControl(control, position)
        },
        setTerrainControl: ({
            source='terrain',
            exaggeration=1,
            position='top-left',
        }={}) => {
            if (!Object.keys(map.style.stylesheet.sources).includes(source)) return

            const control = new maplibregl.TerrainControl({
                source,
                exaggeration,
            })
            map.addControl(control, position)
            map.setTerrain(null)

            control._container.querySelector('button').addEventListener('click', map._gslHandlers.toggleHillshade)
        },
        toggleHillshade: ({
            source='terrain'
        }={}) => {
            if (map.getTerrain() && map._gslHandlers._renderHillshade) {
                if (!map.getLayer('hillshade')) {
                    map.addLayer({
                        id: 'hillshade',
                        source,
                        type: 'hillshade'
                    });
                }
            } else {
                if (map.getLayer('hillshade')) {
                    map.removeLayer('hillshade')
                }
            }
        },
        setPlaceSearchControl: ({
            position='top-left',
        }={}) => {
            const control = new PlaceSearchControl()
            map.addControl(control, position)
        },
        setFitToWorldControl: ({
            position='top-left',
        }={}) => {
            const control = new FitToWorldControl()
            map.addControl(control, position)
        },
        setGSLSettingsControl: ({
            position='top-left',
        }={}) => {
            const control = new GSLSettingsControl()
            map.addControl(control, position)
        },
        setProjection: ({type='mercator'}={}) => {
            if (!type) type = 'mercator'
            map.setProjection({type})
            map._gslHandlers._projection = type 
        },
        getProjection: () => {
            return map._gslHandlers._projection
        },
        createPopup: async (e) => {
            const popupContainer = map._controls.find(i => i instanceof GSLSettingsControl).controls.popup
            if (!popupContainer.querySelector('input[name="popup-toggle"]').checked) return

            const checkedOptions = Array.from(popupContainer.querySelectorAll('input:not([name="popup-toggle"])')).filter(i => i.checked).map(i => i.getAttribute('name').split('-').pop())
            if (!checkedOptions.length) return

            const sourceId = 'popupFeature'
            let source = map.getSource(sourceId)
            if (!source) {
                map.addSource(sourceId, {
                    type: "geojson",
                    data: turf.featureCollection([])
                })
                source = map.getSource(sourceId)
                source.title = 'Popup feature'
            }

            let features = []
            let lngLat = e.lngLat
            if (checkedOptions.includes('layers')) {
                features = map.queryRenderedFeatures(e.point)
                console.log('update features with wms features, other sources')

                features = features.filter(f => {
                    return turf.booleanValid(f) && f.layer.source !== sourceId
                })

                if (features.length > 1) {
                    const point = turf.point([lngLat.lng, lngLat.lat])
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

            const popup = map._gslHandlers._popup = new maplibregl.Popup()
            .setLngLat(lngLat)
            .setHTML(`<div class='mt-2 d-flex flex-column'></div>`)
            .addTo(map)

            popup.on("close", () => {
                map._gslHandlers._popup = null
                map._gslHandlers.removeGeoJSONLayers(sourceId)
                source.setData(turf.featureCollection([]))
            })
            
            const container = popup._container.querySelector('.maplibregl-popup-content').firstChild

            if (features.length) {
                const carousel = customCreateElement({
                    parent: container,
                    className: 'carousel slide',
                })

                const carouselInner = customCreateElement({
                    parent: carousel,
                    className: 'carousel-inner'
                })

                Object.keys(features).forEach(i => {
                    const f = features[i]
                    const header = Array(
                        map.getSource(f.layer.source).title, 
                        f.properties[Array('display_name', 'name', 'title', 'id').find(i => Object.keys(f.properties).find(j => j.includes(i))) ?? Object.keys(f.properties).pop()]
                    ).filter(i => i).join(': ')
                    const content = createFeaturePropertiesTable(f.properties, {header})
                    content.classList.add('fs-12')
                    const carouselItem = customCreateElement({
                        parent: carouselInner,
                        className: `carousel-item ${parseInt(i) === 0 ? 'active' : ''}`,
                        innerHTML: content,
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
                className: 'd-flex flex-wrap gap-2'
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

                const coordsContent = `<span>📋</span><span>${coordsValues[0]}</span><span>${coordsValues[1]}</span>`
                const coords = customCreateElement({
                    tag: 'button',
                    className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap gap-2 fs-12 flex-grow-1',
                    parent: footer,
                    innerHTML: coordsContent,
                    events: {
                        click: (e) => {
                            navigator.clipboard.writeText(coordsValues.join(' '))
                        }
                    }
                })
            }
            
            if (checkedOptions.includes('osm')) {
                const geojson = await fetchReverseNominatim({
                    queryGeom: turf.point(Object.values(lngLat)),
                    zoom: map.getZoom(),
                })
                
                if (geojson?.features?.length) {
                    const feature = geojson.features[0]
                    const place = customCreateElement({
                        tag: 'button',
                        className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap align-items-center gap-2 fs-12 flex-grow-1 pe-3',
                        parent: footer,
                        innerHTML: `<span>📍</span><span class="text-wrap text-break text-start">${feature.properties.display_name}</span>`,
                        events: {
                            click: async (e) => {
                                const geojson = await source.getData()
                                if (geojson?.features?.length && turf.booleanEqual(geojson.features[0], feature)) {
                                    map._gslHandlers.removeGeoJSONLayers(sourceId)
                                    source.setData(turf.featureCollection([]))
                                } else {
                                    map.fitBounds(feature.bbox)
                                    source.setData(turf.featureCollection([feature]))
                                    map._gslHandlers.addGeoJSONLayers(sourceId)
                                }
                            }
                        }
                    })
                }
            }
        },
        removeGeoJSONLayers: (sourceId) => {
            const layers = map.getStyle().layers
            if (!layers) return

            layers.forEach(l => {
                if (l.source !== sourceId) return
                map.removeLayer(l.id)
            })
        },
        addGeoJSONLayers: (sourceId, {
            pointType = 'symbol'
        }={}) => {
            if (!map.getSource(sourceId)) return
            
            const polygonId = `${sourceId}-Polygon`
            let polygonLayer = map.getLayer(polygonId) 
            if (!polygonLayer) {
                polygonLayer = map.addLayer({
                    id: polygonId,
                    type: "fill",
                    source: sourceId,
                    paint: {
                        "fill-color": "#088",
                        "fill-opacity": 0.5
                    },
                    filter: ["==", "$type", "Polygon"]
                })
            }
            
            const lineStringId = `${sourceId}-LineString`
            let lineStringLayer = map.getLayer(lineStringId) 
            if (!lineStringLayer) {
                lineStringLayer = map.addLayer({
                    id: lineStringId,
                    type: "line",
                    source: sourceId,
                    paint: {
                        "line-color": "#000",
                        "line-width": 2
                    },
                    filter: ["==", "$type", "LineString"]
                })
            }

            const pointId = `${sourceId}-Point`
            let pointLayer = map.getLayer(pointId) 
            if (!pointLayer) {
                pointLayer = map.addLayer({
                    id: pointId,
                    type: pointType,
                    source: sourceId,
                    ...(pointType === 'circle' ? {
                        paint: {
                            "circle-radius": 6,
                            "circle-color": "#f00"
                        }
                    } : {
                        layout: {
                            "text-field": "🔴",
                            "text-size": 24,
                            "text-allow-overlap": true
                        }
                    }),
                    filter: ["==", "$type", "Point"]
                })
            }

            return {polygonLayer, lineStringLayer, pointLayer}
        }
    }

    map.on('style.load', () => {
        map._gslHandlers.setProjection()

        map._gslHandlers.setPlaceSearchControl()
        map._gslHandlers.setNavControl()
        map._gslHandlers.setScaleControl()
        map._gslHandlers.setTerrainControl()
        map._gslHandlers.setGeolocateControl()
        map._gslHandlers.setFitToWorldControl()
        map._gslHandlers.setGSLSettingsControl()
    })

    map.on('click', (e) => {
        map._gslHandlers.createPopup(e)
    })

    // map.setTerrain({ source: 'terrain', exaggeration: 1.5 });

    console.log(map)
}