class GeospatialibControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
        this.controls = null
        
        this.config = {
            renderHillshade: true,
            projection: 'mercator',
            popup: null,
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

                if (!Object.keys(map.style.stylesheet.sources).includes(source)) return

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
                this.map.setTerrain({ source, exaggeration });
            },
            toggleHillshade: () => {
                const map = this.map

                const source = map.getTerrain()?.source
                if (source && this.config.renderHillshade) {
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
            setProjection: ({type='mercator'}={}) => {
                if (!type) type = 'mercator'
                this.map.setProjection({type})
                this.config.projection = type
            },
            getProjection: () => {
                return this.config.projection
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
                const source = map.getSource(sourceId)

                let features = []
                let lngLat = e.lngLat

                if (checkedOptions.includes('layers')) {
                    features = map.queryRenderedFeatures(e.point)
                    console.log('update features with features from wms layers, etc.')

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

                const popupWidth = window.innerWidth * 0.5
                const popupHeight = window.innerHeight * 0.5

                const popup = this.config.popup = new maplibregl.Popup()
                .setLngLat(lngLat)
                .setMaxWidth(`${popupWidth}px`)
                .setHTML(`<div class='d-flex flex-column gap-3'></div>`)
                .addTo(map)

                popup.on("close", () => {
                    this.config.popup = null
                    this.handlers.removeGeoJSONLayers(sourceId)
                    this.handlers.setGeoJSONData(sourceId)
                })
                
                const popupContainer = popup._container
                
                const popupTooltip = popupContainer.querySelector('.maplibregl-popup-tip')
                popupTooltip.classList.add(`border-top-${getPreferredTheme()}`, `border-bottom-${getPreferredTheme()}`)
                
                const popupCloseBtn = popupContainer.querySelector('.maplibregl-popup-close-button')
                popupCloseBtn.classList.add(`text-bg-${getPreferredTheme()}`)
                
                const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
                popupContent.classList.add(`bg-${getPreferredTheme()}`)
                popupContent.style.padding = `24px 12px 12px 12px`
                
                const container = popupContainer.querySelector('.maplibregl-popup-content').firstChild
                container.style.maxHeight = `${popupHeight-10-12-24}px`
                container.style.maxWidth = `${popupWidth-12-12}px`
                
                if (features.length) {
                    const carouselContainer = customCreateElement({
                        parent: container,
                        className: 'd-flex overflow-auto'
                    })

                    elementResizeObserver(carouselContainer, (e) => {
                        footer.style.maxWidth = carouselContainer.offsetWidth
                    })

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

                        const tempHeader = '<img src="https://th.bing.com/th/id/OSK.HEROlJnsXcA4gu9_6AQ2NKHnHukTiry1AIf99BWEqfbU29E?w=472&h=280&c=1&rs=2&o=6&pid=SANGAM">'
                        const header = tempHeader ?? Array(
                            f.layer.metadata.title ?? map.getSource(f.layer.source).metadata.title,
                            f.properties[
                                Array('display_name', 'name', 'title', 'id')
                                .find(i => Object.keys(f.properties).find(j => j.includes(i))) 
                                ?? Object.keys(f.properties).pop()
                            ]
                        ).filter(i => i).join(': ')
                        
                        const carouselItem = customCreateElement({
                            parent: carouselInner,
                            className: `carousel-item ${parseInt(i) === 0 ? 'active' : ''}`,
                            innerHTML: createFeaturePropertiesTable(f.properties, {header, tableClass: `fs-12 table-${getPreferredTheme()}`}),
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
                                    const geojson = await source.getData()
                                    if (geojson?.features?.length && turf.booleanEqual(geojson.features[0], feature)) {
                                        this.handlers.removeGeoJSONLayers(sourceId)
                                        this.handlers.setGeoJSONData(sourceId)
                                    } else {
                                        map.fitBounds(feature.bbox)
                                        await this.handlers.setGeoJSONData(sourceId, {data, attribution: data.licence})
                                        this.handlers.addGeoJSONLayers(sourceId)
                                    }
                                }
                            }
                        })
                    }
                }
            },

            setGeoJSONData: async (sourceId, {
                data=turf.featureCollection([]),
                metadata,
                attribution,
            }={}) => {
                const map = this.map

                let source = map.getSource(sourceId)
                if (source) {
                    source.setData(data)
                    if (metadata) {
                        source.metadata = metadata
                    }
                } else {
                    map.addSource(sourceId, {
                        type: "geojson",
                        generateId: true,
                        promoteId: true,
                        data,
                        attribution: attribution ?? '',

                        //url,
                        //tiles,
                        //bounds,
                        //minzoom,
                        //minzoom
                        // maxzoom,
                    })
                    source = map.getSource(sourceId)
                    source.metadata = metadata ?? {}
                }
                return source
            },
            removeGeoJSONLayers: (sourceId, {
                // layer=[],
                // types=[],
                // group=[],
            }={}) => {
                const map = this.map

                map.getStyle().layers?.forEach(l => {
                    if (l.source !== sourceId) return
                    map.removeLayer(l.id)
                })
            },
            addGeoJSONLayers: (sourceId, {
                types={

                }
            }={}) => {
                const map = this.map
                if (!map.getSource(sourceId)) return

                // id = sourceId-layerId-type-groupId
                // metadata = source.metadata + layerId + layer props
                
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
                        type: 'symbol',
                        source: sourceId,
                        ...('symbol' === 'circle' ? {
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
                                            this.config.popup?.remove()
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
                    const geospatialibControl = Object.values(this.map._controls).find(i => i instanceof GeospatialibControl)
                    
                    const sourceId = 'placeSearch'
                    geospatialibControl.handlers.removeGeoJSONLayers(sourceId, {metadata:{title: 'Place search result'}})
                    
                    let data = turf.featureCollection([])

                    const value = input.value.trim()
                    if (value !== '') {
                        const coords = isLngLatString(value)
                        if (coords) {
                            map.flyTo({
                                center: coords,
                                zoom: 11,
                            })
                            data = turf.featureCollection([turf.point(coords)])
                        } else {
                            data = await fetchSearchNominatim(value)
                            if (data?.features.length) {
                                const bbox = turf.bbox(data)
                                map.fitBounds(bbox, {padding:100, maxZoom:12})
                            }
                        }
                    }

                    await geospatialibControl.handlers.setGeoJSONData(sourceId, {data, attribution: data.licence})
                    if (data.features.length) {
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

    map.on('load', () => {
        const control = new GeospatialibControl()
        map.addControl(control, 'bottom-right')
    })   

    console.log(map)
}