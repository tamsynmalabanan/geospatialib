class ControlsHandler {
    constructor(map) {
        this.map = map
        this.config = {
            hillshade: {
                render: true,
            },
            controls: {
                placeSearch: {
                    include: true,
                    position: 'top-left',
                    order: 1,
                    constructor: PlaceSearchControl,
                },
                nav: {
                    include: true,
                    position: 'top-left',
                    order: 2,
                    constructor: maplibregl.NavigationControl,
                    options: {
                        visualizePitch: true,
                        showZoom: true,
                        showCompass: true,
                    },
                    handler: (control) => {
                        const theme = getPreferredTheme()

                        const zoomInBtn = control._container.querySelector('.maplibregl-ctrl-zoom-in')
                        zoomInBtn.innerHTML = ''
                        zoomInBtn.classList.add('bi', 'bi-plus', 'fs-16', `text-bg-${theme}`, 'rounded-top')
                        
                        const zoomOutBtn = control._container.querySelector('.maplibregl-ctrl-zoom-out')
                        zoomOutBtn.innerHTML = ''
                        zoomOutBtn.classList.add('bi', 'bi-dash', 'fs-16', `text-bg-${theme}`, `border-top-${theme}`)
                        
                        const compassBtn = control._container.querySelector('.maplibregl-ctrl-compass')
                        compassBtn.classList.add(`text-bg-${theme}`, `border-top-${theme}`, 'rounded-bottom')
                    }
                },
                terrain: {
                    include: true,
                    position: 'top-left',
                    order: 3,
                    constructor: maplibregl.TerrainControl,
                    options: {
                        source:'terrain',
                        exaggeration:1,
                    },
                    handler: (control) => {
                        this.map.setTerrain(null)

                        control._container.querySelector('button')
                        .addEventListener('click', () => {
                            this.configHillshade()
                        })
                    }
                },
                geolocte: {
                    include: true,
                    position: 'top-left',
                    order: 5,
                    constructor: maplibregl.GeolocateControl,
                    options: {
                        positionOptions: {
                            enableHighAccuracy: true
                        },
                        trackUserLocation: true,
                        showUserHeading: true,
                    },
                },
                fitToWorld: {
                    include: true,
                    position: 'top-left',
                    order: 4,
                    constructor: FitToWorldControl,
                },
                scalebar: {
                    include: true,
                    position: 'bottom-right',
                    order: 1,
                    constructor: maplibregl.ScaleControl,
                    options: {
                        unit: 'nautical',
                        maxWidth: 200,
                    }
                },
                fullscreen: {
                    include: true,
                    position: 'top-left',
                    order: 100,
                    constructor: maplibregl.FullscreenControl,
                },
            },
        }

        this.configControls()
        this.configAttributionControl()
        this.syncTheme()
    }

    configHillshade(){
        const map = this.map

        if (map.getLayer('hillshade')) {
            map.removeLayer('hillshade')
        }
        
        const source = map.getTerrain()?.source
        if (source && this.config.hillshade.render) {
            map.addLayer({
                id: 'hillshade',
                type: 'hillshade',
                source,
            })
        }
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
        const innerHandler = () => {
            inner.querySelectorAll(`a`).forEach(a => {
                a.setAttribute('target', '_blank')
                a.classList.add('text-reset', 'text-decoration-none')
            })
        }

        innerHandler()
        elementMutationObserver(inner, innerHandler, { childList: true, subtree: true })
    }

    configControls() {
        this.removeControls()

        this.controls = Object.fromEntries(
            Object.entries(this.config.controls)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([name, params]) => {
                if (!params.include) return

                const control = new params.constructor(params.options)
                this.map.addControl(control, params.position)
                
                try {
                    params.handler?.(control)
                } catch (error) {
                    console.error(name, error)
                }
                
                return [name, control]
            }).filter(i => i)
        )
    }

    removeControls() {
        if (!this.controls) return
        Object.keys(this.controls).forEach(c => {
            this.map.removeControl(this.controls[c])
        })
        delete this.controls
    }

    syncTheme() {
        const theme = getPreferredTheme()

        this.map.getCanvas().classList.add(`bg-${theme}`)
        
        this.map.getContainer()
        .querySelectorAll('.maplibregl-ctrl')
        .forEach(b => {
            b.classList.add(`text-bg-${theme}`)
        })
        
        this.map.getContainer()
        .querySelectorAll('.maplibregl-ctrl-group button+button')
        .forEach(b => {
            b.classList.add(`border-${theme}`)
        })
        
        document.addEventListener('themeToggled', (e) => {
            this.toggleBasemapGrayscale()
        })
    }

    toggleBasemapGrayscale() {
        if (!this.map.getLayer('basemap')) return

        let sky
        let basemap
        
        if (getPreferredTheme() === 'dark') {
            sky = MAP_DEFAULTS.sky.grayscale
            basemap = MAP_DEFAULTS.basemap.grayscale
        } else {
            basemap = MAP_DEFAULTS.basemap.default
            sky = MAP_DEFAULTS.sky.default
        }

        this.map.sourcesHandler.updateLayerParams('basemap', {paint:basemap})
        
        const newStyle = structuredClone(this.map.getStyle())
        newStyle.sky = sky
        this.map.setStyle(newStyle)
    }

    getScaleInMeters() {
        const control = this.controls.scalebar
        const rawValue = control._container.innerText
        const rawInt = parseFloat(rawValue)
        const unit = rawValue.split(rawInt).pop().trim()
        
        if (control.options.unit === 'metric') {
            if (unit === 'm') return rawInt
            if (unit === 'km') return rawInt * 1000
        }
        
        if (control.options.unit === 'imperial') {
            if (unit === 'mi') return rawInt * 1609.344
            if (unit === 'ft') return rawInt * 0.3048
        }
        
        if (control.options.unit === 'nautical') {
            if (unit === 'nm') return rawInt * 1852
        }
        
        throw new Error(`Unsupported scale: ${unit}`)
    }
}