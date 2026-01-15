class InteractionsHandler {
    constructor(map) {
        this.map = map
        this.config = {
            interactions: {
                tooltip: {
                    active: true,
                    timeout: null,
                    popup: null,
                    sourceId: 'tooltipFeature',
                    events: ['mousemove'],
                    handler: (e) => this.createTooltipPopup(e),
                },
                info: {
                    active: true,
                    targets: {
                        layers: true,
                        osm: true,
                    },
                    timeout: null,
                    popup: null,
                    sourceId: 'infoFeature',
                    events: ['click'],
                    handler: (e) => this.createInfoPopup(e), 
                },
            },
        }
        
        this.configInteractions()
    }

    configCursor() {
        this.map.getCanvas().style.cursor = (
            Object.values(this.config.interactions).find(i => i.active) 
            ? 'pointer' 
            : ''
        )
    }

    configInteractions() {
        Object.values(this.config.interactions).forEach(i => {
            i.events.forEach(ev => {
                this.map.on(ev, (e) => {
                    this.clearConfig(i)
                    clearTimeout(i.timeout)
                    i.timeout = setTimeout(async () => {
                        i.handler(e)
                    }, 100)
                })
            })
        })

        this.configCursor()
    }

    clearConfig(config) {
        if (config.popup) {
            config.popup.remove()
            config.popup = null
        }

        if (config.sourceId) {
            this.map.sourcesHandler.removeSourceLayers(config.sourceId)
            this.map.sourcesHandler.setGeoJSONData(config.sourceId)
        }
    }

    async getCanvasData({
        bbox, point, event,
        layers, filter,
        queryRasters=false,
    }) {
        let features = this.map.queryRenderedFeatures(bbox ?? point ?? event?.point, {layers, filter})

        if (queryRasters) {
            console.log('update features with features from rasters i.e. wms, dems, etc.')

            const sources = {}
 
            this.map.getStyle().layers.forEach(l => {
                if (layers?.length && !layers.includes(l.id)) return
                if (l.source in sources) return

                const source = this.map.getStyle().sources[l.source]
                if (Array('vector', 'geojson').includes(source.type)) return
                sources[l.source] = source
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

                if (params?.bbox && !turf.booleanIntersects(refFeature, turf.bboxPolygon(params?.bbox))) continue

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

    getFeatureLabel(f) {
        return f.properties[
            f.layer?.metadata?.label ?? Array(
                'display_name',
                'name:en', 
                'name', 
                'title', 
                'id', 
            ).find(i => Object.keys(f.properties).find(j => j.startsWith(i)))
        ] ?? Object.values(f.properties).pop()
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
            }
        )}
    }

    async createTooltipPopup(e) {
        const map = this.map
        
        const tooltip = this.config.interactions.tooltip
        if (!tooltip.active) return

        if (document.elementsFromPoint(CURSOR.x, CURSOR.y).find(el => {
            return el.matches('.maplibregl-popup-content') || el.matches('.maplibregl-ctrl')
        })) return

        const validVectorLayers = map.getStyle().layers.filter(l => {
            const source = map.getStyle().sources[l.source]
            return (
                Array('geojson', 'vector').includes(source?.type)
                && l.metadata?.tooltip?.active
                && source?.data?.features?.length
                && !Object.values(this.config.interactions).map(i => i.sourceId).includes(l.source)
            )
        })
        if (!validVectorLayers.length) return

        const features = await this.getCanvasData({
            event: e, 
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

        map.sourcesHandler.setGeoJSONData(tooltip.sourceId, {
            data: turf.featureCollection([turf.feature(feature.geometry)]), 
        })

        map.sourcesHandler.addGeoJSONLayers(tooltip.sourceId, {
            groups: this.defaultLayerGroups()
        })

        const popup = tooltip.popup = new maplibregl.Popup({closeButton: false})
        .setLngLat(e.lngLat)
        .setHTML(`<p class="text-break text-center m-0 p-0">${label}</p>`)
        .addTo(map)

        const theme = getPreferredTheme()
        
        const popupContent = popup._container.querySelector('.maplibregl-popup-content')
        popupContent.classList.add('p-2', `bg-${theme}-50`)
        
        const container = popupContent.firstChild
        container.classList.add(`text-${theme === 'light' ? 'dark' : 'light'}`)
        
        this.configPopupPointer(popup)
    }

    async configInfoLayer({feature, toggle}={}) {
        const info = this.config.interactions.info

        if (toggle?.classList.contains('text-bg-info')) {
            toggle.classList.remove('text-bg-info')
            toggle.classList.add('text-bg-secondary')

            this.map.sourcesHandler.removeSourceLayers(info.sourceId)
            this.map.sourcesHandler.setGeoJSONData(info.sourceId)
        } else {
            const previousToggle = toggle.closest('.maplibregl-popup-content').querySelector('.text-bg-info')
            if (previousToggle) {
                previousToggle.classList.remove('text-bg-info')
                previousToggle.classList.add('text-bg-secondary')
            }

            toggle.classList.add('text-bg-info')
            this.map.fitBounds(feature.bbox ?? turf.bbox(feature), {padding:100, maxZoom:11})
            this.map.sourcesHandler.setGeoJSONData(info.sourceId, {
                data: turf.featureCollection([turf.feature(feature.geometry, feature.properties)])
            })

            if (!previousToggle) {
                this.map.sourcesHandler.addGeoJSONLayers(info.sourceId, {
                    groups: this.defaultLayerGroups()
                })
            }
        }
    }

    getLayerTitle(layer) {
        const source = this.map.getSource(layer.source)
        return (
            layer.metadata?.params?.title 
            ?? layer.metadata?.params?.name 
            ?? source?.metadata?.params?.title 
            ?? source?.metadata?.params?.name
        )
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

    async createInfoPopup(e) {
        const map = this.map

        const info = this.config.interactions.info
        if (!info.active) return

        let lngLat = e.lngLat

        const theme = getPreferredTheme()
        const popupWidth = Math.max(window.innerWidth * 0.75, 300)
        const popupHeight = Math.max(window.innerHeight * 0.5, 400)

        const popup = info.popup = new maplibregl.Popup()
        .setLngLat(lngLat)
        .setMaxWidth(`${popupWidth}px`)
        .setHTML(`<div></div>`)
        .addTo(map)

        popup.on("close", (e) => {
            this.clearConfig(info)
        })
        
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

        const coordsValues = Object.values(lngLat).map(i => parseFloat(i.toFixed(6)))    

        const zoom = customCreateElement({
            tag: 'button',
            className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap gap-2 fs-12',
            parent: footer,
            innerText: '🔍',
            events: {
                click: (e) => {
                    map.flyTo({
                        center: coordsValues,
                        zoom: 11,
                    })
                }
            }
        })

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
        
        const targets = Object.keys(info.targets).filter(i => info.targets[i])

        if (targets.includes('osm')) {
            const data = await fetchReverseNominatim({
                geom: turf.point(coordsValues),
                zoom: map.getZoom(),
                abortEvents: [[map.getCanvas(), ['click']]]
            })
            
            if (data?.features?.length) {
                const feature = data.features[0]
                const toggle = customCreateElement({
                    tag: 'button',
                    className: 'btn btn-sm text-bg-secondary rounded-pill badge d-flex flex-nowrap align-items-center gap-2 fs-12 pe-3 flex-grow-1',
                    parent: footer,
                    innerHTML: `<span>📍</span><span class="text-wrap text-break text-start">${this.getFeatureLabel(feature)}</span>`,
                    events: {
                        click: async (e) => {
                            this.configInfoLayer({feature, toggle})
                        }
                    }
                })
            }
        }

        let features = []

        if (targets.includes('layers')) {
            features = (await this.getCanvasData({
                event:e, 
                queryRasters:true, 
                layers: this.map.getStyle().layers.filter(l => l.metadata?.popup?.active).map(l => l.id)
            }))?.filter(f => f.geometry && f.layer?.source !== info.sourceId && Object.keys(f.properties).length)

            if (features?.length > 1) {
                const point = turf.point(Object.values(lngLat))
                const intersectedFeatures = features.filter(f => turf.booleanIntersects(f, point))
                if (intersectedFeatures.length) {
                    features = intersectedFeatures
                } else {
                    const polygonFeatures = features.map(f => {
                        if (f.geometry.type.includes('Polygon')) return f
                        
                        const clone_f = turf.clone(f)
                        clone_f.original_f = f
                        clone_f.geometry = turf.buffer(clone_f, 10, { units: "meters" }).geometry
                        return clone_f
                    })

                    features = polygonFeatures.map(f1 => {
                        return polygonFeatures.filter(f2 => turf.booleanIntersects(f1, f2))
                    }).reduce((a, b) => (b.length > a.length ? b : a))
                    
                    if (features.length > 1) {
                        try {
                            const intersection = turf.intersect(turf.featureCollection(features))
                            lngLat = new maplibregl.LngLat(...turf.pointOnFeature(intersection).geometry.coordinates)
                        } catch (error) {console.log(error)}
                    }

                    features = features.map(f => f.original_f ?? f)
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

                const toggle = customCreateElement({
                    tag: 'button',
                    className: 'btn btn-sm text-bg-secondary rounded-pill badge fs-12',
                    style: {zIndex: 1000},
                    parent: menu,
                    innerText: '👁️',
                    events: {
                        click: async (e) => {
                            this.configInfoLayer({feature: turf.feature(f.geometry, f.properties), toggle})
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
                        this.getFeatureLabel(f)
                    ).filter(i => i).join(': ')
                })

                const propertiesTable = this.featurePropertiesToTable(f.properties, {
                    parent: content, 
                    tableClass: `table-sm table-striped m-0 fs-12 table-${theme}`,
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
        
        elementMutationObserver(popupContainer, handler, {
            attributeFilter: ['class'],
        })

        this.map.on('move', handler)
        popup.on('close', (e) => this.map.off('move', handler))
    }
}