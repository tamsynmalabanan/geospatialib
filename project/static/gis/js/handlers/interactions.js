class InteractionsHandler {
    constructor(map) {
        this.map = map
        this.map.interactionsHandler = this

        this.config = {
            tooltip: {
                sourceId: 'tooltipFeature',
            },
            info: {
                sourceId: 'infoFeature',
            },
        }
        
        this.configInteractions()
    }

    configCursor() {
        this.map.getCanvas().style.cursor = (
            Object.values(this.map._settings.interactions).find(i => i.active)
            ? 'pointer' : ''
        )
    }

    configInteractions() {
        let tooltipTimeout
        this.map.on('mousemove', (e) => {
            this.clearConfig(this.config.tooltip)
            clearTimeout(tooltipTimeout)
            tooltipTimeout = setTimeout(async () => {
                this.createTooltipPopup(e)
            }, 100)
        })

        let infoTimeout
        this.map.on('click', (e) => {
            this.clearConfig(this.config.info)
            clearTimeout(infoTimeout)
            infoTimeout = setTimeout(async () => {
                this.createInfoPopup(e)
            }, 100)
        })

        this.configCursor()
    }

    clearConfig(config) {
        if (config.popup) {
            config.popup.remove()
            config.popup = null
        }

        const sourceId = config.sourceId
        if (sourceId) {
            this.map.sourcesHandler.removeSourceLayers(sourceId)
            this.map.sourcesHandler.getGeoJSONSource(sourceId)
        }
    }

    clearConfigs() {
        Object.values(this.config).forEach(i => this.clearConfig(i))
    }

    async getCanvasData({
        bbox, point,
        layers, filter,
        rasters=false,
    }={}) {
        const map = this.map

        if (!point && !bbox) {
            bbox = [[0,0], [map.getCanvas().width, map.getCanvas().height]]
        }

        let features = map.queryRenderedFeatures(bbox ?? point, {layers, filter})

        if (rasters && point) {
            const sources = new Set(map.getStyle().layers.map(l => {
                if (layers?.length && !layers.includes(l.id)) return

                const source = map.getSource(l.source)
                if (Array('vector', 'geojson').includes(source.type)) return
                if (Array('xyz').includes(source.metadata?.params.type)) return
                
                return source
            }).filter(Boolean))

            const lngLat = map.unproject(point)
            const feature = turf.point(Object.values(lngLat))

            for (const source of sources) {
                const metadata = source.metadata
                const params = metadata?.params

                if (params?.bbox && !turf.booleanPointInPolygon(feature, turf.bboxPolygon(params.bbox))) continue

                let data

                if (Array('wms').includes(params?.type)) {
                    try {
                        data = await fetchWMSData(params, {map, point})
                    } catch (error) {
                        console.log(error)
                    }
                }
                                
                if (data?.features?.length) {
                    features = [
                        ...features,
                        ...data.features.map(f => {
                            f.layer = {source:source.id}
                            return f
                        })
                    ]
                }
            }
        }

        const uniqueFeatures = []

        features.forEach(f1 => {
            f1.geometry = this.getRawFeature(f1).geometry
            if (!uniqueFeatures.find(f2 => {
                if (f1.source !== f2.source) return false
                if (!featuresAreSimilar(f1, f2)) return false
                return true
            })) uniqueFeatures.push(f1)
        })
        
        return uniqueFeatures
    }

    getLayerTitle(layer) {
        const source = this.map.getSource(layer?.source)
        return (
            layer.metadata?.params?.title 
            ?? layer.metadata?.params?.name 
            ?? source?.metadata?.params?.title 
            ?? source?.metadata?.params?.name
        )
    }

    getFeatureLabel(f) {
        return f.properties[
            f.layer?.metadata?.label
            || Object.keys(f.properties).find(i => Array(
                'display_name',
                'name:en', 
                'name', 
                'title', 
                'label', 
            ).find(j => i.includes(j))) 
            || Object.keys(f.properties).find(i => i !== '__sys__')
        ]
    }

    defaultLayerGroups() {
        const color = `hsl(180, 100%, 50%)`
        return {
            default: this.map.sourcesHandler.getGeoJSONLayerParams({
                color,
                customParams: {
                    'fill' : {
                        'polygons': {
                            render: true,
                            params: {
                                paint: {
                                    "fill-color": hslaColor(color).toString({a:0})
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
            })
        }
    }

    async createTooltipPopup(e) {
        const map = this.map
        if (!this.map._settings.interactions.tooltip.active) return
        
        const tooltip = this.config.tooltip

        if (document.elementsFromPoint(CURSOR.x, CURSOR.y).find(el => {
            return el.matches('.maplibregl-popup-content') || el.matches('.maplibregl-ctrl')
        })) return

        const validVectorLayers = map.getStyle().layers.filter(l => {
            const source = map.getStyle().sources[l.source]
            return (
                Array('geojson', 'vector').includes(source?.type)
                && l.metadata?.tooltip?.active
                && source?.data?.features?.length
                && !Object.values(this.config).map(i => i.sourceId).includes(l.source)
            )
        })
        if (!validVectorLayers.length) return

        const features = await this.getCanvasData({
            point: e.point, 
            layers: validVectorLayers.map(l => l.id)
        })

        if (!features?.length) return

        let feature
        let label

        for (const f of features) {
            label = this.getFeatureLabel(f)
            if (label) {
                feature = f
                break
            }
        }

        if (!label) return

        const data = turf.featureCollection([turf.feature(feature.geometry)])
        map.sourcesHandler.getGeoJSONSource(tooltip.sourceId).setData(data)

        map.sourcesHandler.addGeoJSONLayers(tooltip.sourceId, {
            properties: {
                metadata: {
                    groups: this.defaultLayerGroups()
                }
            }
        })

        const popup = tooltip.popup = new maplibregl.Popup({closeButton: false})
        .setLngLat(e.lngLat)
        .setHTML(`<p class="text-break text-center m-0 p-0">${label}</p>`)
        .addTo(map)

        const theme = getPreferredTheme()
        
        const popupContent = popup._container.querySelector('.maplibregl-popup-content')
        popupContent.classList.add('p-2', `bg-${theme}-75`)
        
        const container = popupContent.firstChild
        container.classList.add(`text-${theme === 'light' ? 'dark' : 'light'}`)
        
        this.configPopupPointer(popup)
    }

    async configInfoLayer({feature, toggle}={}) {
        const info = this.config.info
        const sourceId = info.sourceId

        if (toggle?.classList.contains('text-bg-info')) {
            toggle.classList.remove('text-bg-info')
            toggle.classList.add('text-bg-secondary')

            this.map.sourcesHandler.removeSourceLayers(sourceId)
            this.map.sourcesHandler.getGeoJSONSource(sourceId)
        } else {
            const previousToggle = toggle.closest('.maplibregl-popup-content').querySelector('.text-bg-info')
            if (previousToggle) {
                previousToggle.classList.remove('text-bg-info')
                previousToggle.classList.add('text-bg-secondary')
            }

            toggle.classList.add('text-bg-info')
            this.map.fitBounds(feature.bbox ?? turf.bbox(feature), {padding:100, maxZoom:Math.max(11, this.map.getZoom())})

            const data = turf.featureCollection([turf.feature(feature.geometry, feature.properties)])
            this.map.sourcesHandler.getGeoJSONSource(sourceId)?.setData(data)

            if (!previousToggle) {
                this.map.sourcesHandler.addGeoJSONLayers(sourceId, {
                    properties: {
                        metadata: {
                            groups: this.defaultLayerGroups()
                        }
                    }
                })
            }
        }
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
            style: {
                userSelect: 'text'
            }
        })

        const tbody = customCreateElement({
            tag: 'tbody',
            parent: table,
        })
        
        Object.keys(properties).forEach(property => {
            if (property === '__sys__') return 

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
                className: 'text-wrap text-break pe-3',
                style: {maxWidth: `${window.innerWidth * 0.4}px`},
                innerHTML: data   
            })
        })

        return container
    }

    async createOSMPlaceToggle({
        geom,
        abortEvents,
        parent
    }={}) {
        const data = await fetchReverseNominatim({
            geom,
            zoom: this.map.getZoom(),
            abortEvents,
        })
        
        if (data?.features?.length) {
            const feature = data.features[0]
            const label = this.getFeatureLabel(feature)
            const innerHTML = `<span>📍</span><span class="text-wrap text-break text-start">${label}</span>`
            const toggle = customCreateElement({
                tag: 'button',
                className: 'btn btn-sm text-bg-secondary   d-flex flex-nowrap align-items-center gap-2 fs-12 pe-3 flex-grow-1',
                parent,
                innerHTML,
                events: {
                    click: async (e) => {
                        this.configInfoLayer({feature, toggle})
                        if (toggle.classList.contains('text-bg-info')) {
                            navigator.clipboard.writeText(label)
                        }
                    }
                }
            })
        }
    }

    createCoordinatesToggle({
        parent,
        lngLat
    }={}) {
        const coordsValues = Object.values(lngLat).map(i => parseFloat(i.toFixed(6)))    
        const innerHTML = `<span>🔍</span>${coordsValues.map(i => `<span>${i}</span>`).join('')}`
        const feature = turf.point(coordsValues)

        const coords =  customCreateElement({
            tag: 'button',
            className: 'btn btn-sm text-bg-secondary   d-flex flex-nowrap gap-2 fs-12 flex-grow-1',
            parent,
            innerHTML,
            events: {
                click: (e) => {
                    this.configInfoLayer({feature, toggle:coords})
                    
                    if(coords.classList.contains('text-bg-info')) {
                        navigator.clipboard.writeText(coordsValues.join(' '))
                    }
                }
            }
        })

        return coords
    }

    getFeatureId(f) {
        return f.properties?.__sys__?.id ?? JSON.parse(f.properties?.__sys__ ?? '{}').id
    }

    getRawFeature(f) {
        const id = this.getFeatureId(f)
        const source = this.map.getStyle().sources[f.source]
        if (id && source) {
            return source.data.features.find(i => i.properties.__sys__.id === id)
        } else {
            return f
        }
    }

    async createInfoPopup(e) {
        const map = this.map
        if (!this.map._settings.interactions.info.active) return

        const info = this.config.info

        let lngLat = e.lngLat

        const theme = getPreferredTheme()
        const popupWidth = Math.max(window.innerWidth * 0.75, 400)

        const popup = info.popup = new maplibregl.Popup()
        .setLngLat(lngLat)
        .setMaxWidth(`${popupWidth}px`)
        .setHTML(`<div></div>`)
        .addTo(map)
        
        popup.on("close", (e) => { this.clearConfig(info) })
        
        const popupContainer = popup._container
        
        const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
        popupContent.classList.add(`bg-${theme}`)
        popupContent.style.padding = `24px 12px 12px 12px`
        this.configPopupPointer(popup)
        
        const popupCloseBtn = popupContainer.querySelector('.maplibregl-popup-close-button')
        popupCloseBtn.classList.add(`text-bg-${theme}`)
        
        const container = popupContent.firstChild
        container.className = `d-flex flex-column gap-3`
        container.style.maxWidth = `${popupWidth-12-12}px`
        
        const footer = customCreateElement({
            parent: container,
            className: 'd-flex flex-wrap gap-2',
            style: { maxWidth: `${popupWidth/3}px` }
        })

        this.createCoordinatesToggle({parent: footer, lngLat})
        .addEventListener('click', (e) => popup.setLngLat(lngLat))

        const targets = (
            Object.entries(this.map._settings.interactions.info.targets)
            .filter(i => i[1]).map(i => i[0])
        )

        if (targets.includes('layers')) {
            let features = []

            features = (await this.getCanvasData({
                point:e.point, rasters:true, 
                layers: this.map.getStyle().layers.filter(l => l.metadata?.popup?.active).map(l => l.id)
            }))?.filter(f => (
                f.geometry 
                && Object.keys(f.properties).filter(i => i !== '__sys__').length
                && !Object.values(this.config).map(i => i.sourceId).includes(f.layer?.source)
            ))

            if (features?.length > 1) {
                const buffer = map.controlsHandler.getScaleInMeters()/1000

                const polygonFeatures = features.map(f => {
                    if (f.geometry.type.includes('Polygon')) return f
                    
                    const clone_f = turf.clone(f)
                    clone_f.original_f = f
                    clone_f.geometry = turf.buffer(clone_f, buffer, { units: "meters" }).geometry
                    return clone_f
                })
        
                features = polygonFeatures.map(f1 => {
                    return polygonFeatures.filter(f2 => turf.booleanIntersects(f1, f2))
                }).reduce((a, b) => (b.length > a.length ? b : a))
                
                features = features.map(f => f.original_f ?? f)
            }
    
            popup.setLngLat(lngLat)

            if (features?.length) {
                const carouselContainer = customCreateElement({
                    style: {maxWidth: `400px`,}
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

                Object.entries(features).forEach(([i, feature]) => {
                    const carouselItem = customCreateElement({
                        parent: carouselInner,
                        className: `carousel-item px-1 ${parseInt(i) === 0 ? 'active' : ''}`,
                    })
    
                    const content = customCreateElement({
                        parent: carouselItem,
                        className: `d-flex flex-column gap-2`,
                        style: {maxHeight: `${Math.max(map.getContainer().offsetHeight*0.3, 300)}px`}
                    })
    
                    const title = Array(
                        this.getLayerTitle(feature.layer),
                        this.getFeatureLabel(feature)
                    ).filter(i => i).join(': ')

                    const innerHTML = `<span>${Array(Number(i)+1,features.length).join('/')}</span><span>${title}</span>`
    
                    const toggle = customCreateElement({
                        tag: 'button',
                        className: 'btn btn-sm text-bg-secondary fs-12 d-flex gap-2 text-start fw-bold',
                        style: {zIndex: 1000},
                        parent: content,
                        innerHTML,
                        events: {
                            click: async (e) => {
                                this.configInfoLayer({feature, toggle})
                                
                                if (toggle.classList.contains('text-bg-info')) {
                                    popup.setLngLat(new maplibregl.LngLat(...turf.pointOnFeature(feature).geometry.coordinates))
                                    navigator.clipboard.writeText(title)
                                } else {
                                    popup.setLngLat(lngLat)
                                }
                            }
                        }
                    })
    
                    // const header = customCreateElement({
                    //     parent: content,
                    //     className: `fw-bold text-break text-wrap text-start fs-14`,
                    //     style: {maxWidth:`400px`},
                    //     innerHTML: title,
                    // })
    
                    content.appendChild(this.featurePropertiesToTable(feature.properties, {
                        tableClass: `table-sm table-striped m-0 fs-12 table-${theme}`,
                        containerClass: `overflow-y-auto flex-grow-1`,
                    }))

                })

                if (features.length > 1) {
                    Array.from(customCreateElement({
                        innerHTML: `
                            <button class="carousel-control-prev w-auto h-auto mt-2" type="button" data-bs-target="#${carousel.id}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Previous</span>
                            </button>
                            <button class="carousel-control-next w-auto h-auto me-3" type="button" data-bs-target="#${carousel.id}" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Next</span>
                            </button>
                        `
                    }).children).forEach(b => carousel.appendChild(b))
                }
                
                carouselContainer.appendChild(carousel)
            }
        }
        
        if (targets.includes('osm')) {
            this.createOSMPlaceToggle({
                geom: turf.point(Object.values(lngLat)),
                abortEvents: [[this.map.getCanvas(), ['click']]],
                parent: footer,
            })
        }
    }

    configPopupPointer(popup) {
        const popupContainer = popup._container
        const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
        const popupTooltip = popupContainer.querySelector('.maplibregl-popup-tip')
        
        const handler = (e) => {
            popupTooltip.removeAttribute('style')
            
            const color = window.getComputedStyle(popupContent).backgroundColor
            const style = window.getComputedStyle(popupTooltip)
 
            Array('Top', 'Bottom', 'Left', 'Right').forEach(pos => {
                if (style.getPropertyValue(`border-${pos.toLowerCase()}-color`) === `rgb(255, 255, 255)`) {
                    popupTooltip.style[`border${pos}Color`] = color
                }
            })
        }

        handler()

        this.map.on('move', handler)
        
        const observer = elementMutationObserver(popupContainer, handler, {
            attributeFilter: ['class'],
        })

        document.addEventListener('themeToggled', handler)

        popup.on('close', (e) => {
            this.map.off('move', handler)
            observer.disconnect()
            document.removeEventListener('themeToggled', handler)
        })
    }
}

const CURSOR = { x: null, y: null, }

let mousemoveTimeout
document.addEventListener("mousemove", (e) => {
    clearTimeout(mousemoveTimeout)
    mousemoveTimeout = setTimeout(() => {
        CURSOR.x = e.clientX
        CURSOR.y = e.clientY
    }, 100)
})