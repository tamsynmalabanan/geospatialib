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
        this.createMenuItem = () => {
            return customCreateElement({
                tag: 'div',
                parent: this.dropdownMenu,
                className: 'd-flex flex-column gap-1',
            })
        }
        this.createControls = () => {
            this.controls = {}
            Object.keys(this.controlHandlers).forEach(name => {
                this.controls[name] = this.controlHandlers[name]()
            })
        }
        this.createControlTitle = (title) => {
            return customCreateElement({
                tag: 'span',
                innerText: title,
                className: 'fs-12 user-select-none fw-bold text-secondary'
            })
        }
        this.controlHandlers = {
            projections: () => {
                const item = this.createMenuItem()
                item.appendChild(this.createControlTitle('Projection options'))

                const container = customCreateElement({
                    parent: item,
                    className: 'd-flex flex-wrap gap-1'
                })

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

                return item
            },
            popup: () => {
                const item = this.createMenuItem()
                item.appendChild(this.createControlTitle('Popup options'))

                const container = customCreateElement({
                    parent: item,
                    className: 'd-flex flex-wrap gap-1'
                })

                const options = {
                    toggle: {
                        label: 'Toggle popup',
                        icon: '💬',
                    },
                    // elev: {
                    //     label: 'Elevation',
                    //     icon: '🏔️',
                    // },
                    osm: {
                        label: 'Openstreetmap',
                        icon: '🗾',
                    },
                    layers: {
                        label: 'Layers',
                        icon: '📚',
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
                            ...(isToggle ? {checked: true} : {})
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
                                container.querySelectorAll('input').forEach(el => {
                                    if (el === input) return
                                    if (!checked && el.checked) el.nextElementSibling.click()
                                    el.disabled = !checked
                                })
                            }} : {})
                        }
                    })

                    titleToTooltip(label)
                })

                return item
            },
            misc: () => {
                const item = this.createMenuItem()

                const collapse = customCreateElement({
                    className: 'd-flex flex-wrap gap-1'
                })

                const toggle = customCreateElement({
                    parent: item,
                    tag: 'a', 
                    className: 'text-reset text-decoration-none',
                    attrs: {
                        'data-bs-toggle': 'collapse',
                        href: `#${collapse.id}`,
                        role: 'button',
                        'aria-expanded': false,
                        'aria-controls': collapse.id
                    },
                    innerHTML: this.createControlTitle('More options')
                })

                item.appendChild(collapse)

                const input = customCreateElement({
                    tag: 'input',
                    parent: collapse,
                    attrs: {
                        type: 'checkbox',
                        name: 'hillshade',
                        checked: true
                    },
                    className: 'btn-check'
                })
                
                const label = customCreateElement({
                    tag: 'label',
                    parent: collapse,
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

                return item
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
        createPopup: async ({
            lngLat,
        }={}) => {
            const popupContainer = map._controls.find(i => i instanceof GSLSettingsControl).controls.popup
            if (!popupContainer.querySelector('input[name="popup-toggle"]').checked) return

            const pt = lngLat ?? map.getCenter()
            const popup = new maplibregl.Popup()
            .setLngLat(pt)
            .setHTML(`
                <span>Clicked Location</span>
                <p>Longitude: ${pt.lng.toFixed(4)}<br>
                Latitude: ${pt.lat.toFixed(4)}</p>
            `)
            .addTo(map)

            if (!lngLat) {
                popup._container.querySelector('.maplibregl-popup-tip')?.remove()
            }
        }
    }

    map.on('style.load', () => {
        map._gslHandlers.setProjection()

        map._gslHandlers.setNavControl()
        map._gslHandlers.setScaleControl()
        map._gslHandlers.setTerrainControl()
        map._gslHandlers.setGeolocateControl()
        map._gslHandlers.setFitToWorldControl()
        map._gslHandlers.setGSLSettingsControl()
    })

    map.on('click', (e) => {
        map._gslHandlers.createPopup({lngLat: e.lngLat})
    })

    // Enable terrain rendering
    // map.setTerrain({ source: 'terrain', exaggeration: 1.5 });

    console.log(map)
}