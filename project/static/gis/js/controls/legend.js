class LegendControl {
    constructor(options={}) {
    }

    createLegendContainer() {
        const container = this.legendCollapse =  customCreateElement({
            parent: this._container,
            className: 'p-0',
            style: {
                maxWidth: `85vw`,
            }
        })

        const content = customCreateElement({
            parent:container,
            className: 'd-flex flex-column'
        })

        const header = customCreateElement({
            parent: content,
            className: 'd-flex justify-content-between align-items-center px-3 py-2'
        })

        const title = customCreateElement({
            parent: header,
            className: 'fs-14 fw-bold me-5',
            innerText: 'Legend'
        })

        const options = customCreateElement({
            parent: header,
            className: 'd-flex flex-nowrap gap-3 ms-5',
        })

        
        const menuToggle = customCreateElement({
            parent: options,
            className: 'bi bi-list h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => menuContainer.classList.toggle('d-none',)
            }
        })
        
        const legendToggle = customCreateElement({
            parent: options,
            className: 'bi bi-stack h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => layerLegendContainer.classList.toggle('d-none',)
            }
        })

        const collapse = customCreateElement({
            parent: options,
            className: 'bi bi-chevron-up h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => {
                    container.classList.add('d-none')
                    this.control.classList.remove('d-none')
                }
            }
        })

        const menuContainer = customCreateElement({
            parent: content,
            className: 'px-3 pb-2'
        })
        
        const menu = customCreateElement({
            parent:menuContainer,
            className: 'd-flex flex-wrap',
            innerText: 'menu'
        })
        
        const layerLegendContainer = customCreateElement({
            parent: content,
        })

        this.legendContainer = customCreateElement({
            parent: layerLegendContainer,
            className: 'd-flex flex-column gap-3 overflow-y-auto px-3 pb-2',
            style: { maxHeight: `45vh` }
        })

        return container
    }

    getLegendLayers() {
        const excludedPrefix = (
            Array('systemOverlays', 'baseLayers')
            .flatMap(i => this.map.sourcesHandler.config[i])
        )
        
        return this.map.getStyle().layers.filter(l => {
            return !excludedPrefix.find(prefix => l.id.startsWith(prefix))
        })
    }

    updateSettings() {
        const map = this.map
        const settings = map._settings

        const legendSources = {}
        const legendLayers = {}

        this.getLegendLayers().forEach(layer => {
            const source = map.getSource(layer.source)
            legendSources[layer.source] = {
                metadata: source.metadata
            }
            
            legendLayers[`${layer.source}-${layer.metadata.name}`] = {
                metadata: layer.metadata
            }
        })

        settings.legend.sources = legendSources
        settings.legend.layers = legendLayers

        map.controlsHandler.controls?.settings?.updateSettings()
    }

    handleAddLayer() {
        const map = this.map
        map.on('layeradded', (e) => {
            const layer = e.layer
            const params = layer.metadata?.params
            if (!params) return
            
            console.log(e)

            const layerName = Array(layer.source, layer.metadata.name).join('-')
            let container = this.legendContainer.querySelector(`[data-layer-name="${layerName}"]`)
            if (container) return

            const withinBounds = map.bboxToGeoJSON().features.find(f => {
                return turf.booleanIntersects(turf.bboxPolygon(params.bbox), f)
            })

            container = customCreateElement({
                parent: this.legendContainer,
                className: 'd-flex flex-column gap-2',
                attrs: {
                    'data-layer-name': layerName
                },
                handlers: {
                    insertBefore: (el) => {
                        this.legendContainer.insertBefore(el, this.legendContainer.firstElementChild)
                    }
                }
            })

            const header = customCreateElement({
                parent: container,
                className: 'd-flex flex-nowrap justify-content-between'
            })

            const collapse = customCreateElement({
                parent: container,
                className: 'collapse show'
            })

            const title = customCreateElement({
                parent: header,
                tag: 'span',
                className: 'text-wrap text-break flex-grow-1 fw-bold',
                innerText: layer.metadata.params.title,
                attrs: {
                    'data-bs-toggle': 'collapse',
                    'data-bs-target': `#${collapse.id}`,
                },
            })

            const options = customCreateElement({
                parent: header,
                className: 'ms-5 d-flex flex-nowrap gap-2'
            })

            const outsideBoundsIndicator = customCreateElement({
                tag: 'i',
                parent: options,
                className: `bi bi-slash-square text-secondary ${withinBounds ? 'd-none' : ''}`,
                attrs: {title: 'Layer out of bounds.'}
            })

            const menuContainer = customCreateElement({
                parent: options,
            })


            const menuToggle = customCreateElement({
                tag: 'i',
                parent: menuContainer,
                className: 'bi bi-three-dots',
                attrs: {
                    'data-bs-toggle': 'dropdown',
                }
            })

            const menu = customCreateElement({
                parent: menuContainer,
                className: 'dropdown-menu',
                tag: 'ul',
            })

            const layerMenu = {
                section1: {
                    zoom: {
                        innerText: 'Zoom to layer',
                        events: {
                            click: (e) => {
                                map.fitBounds(layer.metadata.params.bbox)
                            }
                        }
                    },
                },
                section2: {
                    remove: {
                        innerText: 'Remove layer',
                        events: {
                            click: (e) => {
                                const source = map.getSource(layer.source)
                                if (Array('geojson').includes(source.type)) {
                                    map.sourcesHandler.getLayersByName(layerName)
                                    .forEach(l => map.removeLayer(l.id))
                                } else {
                                    map.removeLayer(layer.id)
                                }
                            }
                        }
                    },
                }
            }

            Object.entries(layerMenu).forEach(([section, items]) => {
                Object.entries(items).forEach(([name, params]) => {
                    const item = customCreateElement({
                        parent: menu,
                        tag: 'li',
                        className: 'dropdown-item fs-12',
                        ...params,
                    })
                })

                if (Object.keys(items).length && Object.keys(layerMenu).pop() !== section) {
                    const divider = customCreateElement({
                        parent: menu,
                        tag: 'li',
                        innerHTML: '<hr class="dropdown-divider">'
                    })
                }
            })

            const body = customCreateElement({
                parent: collapse,
                className: 'd-flex flex-column gap-2'
            })

            const legend = customCreateElement({
                parent: body,
                className: withinBounds ? '' : 'd-none',
                innerHTML: this.getLayerLegend(layer),
                handlers: {
                    setId: (el) => {
                        container.setAttribute('data-layer-legend', el.id)
                    }
                }
            })

            const attr = customCreateElement({
                parent: body,
                innerHTML: layer.metadata.params.attribution,
            })

            this.updateSettings()
        })
    }

    getLayerLegend(layer) {
        const params = layer.metadata.params
        const style = params.styles[params.style]

        if (params.type === 'xyz' && style.thumbnail) {
            return `<img class="" src="${style.thumbnail}" alt="Image not found." height="21" width="30">`
        }

        if (params.type === 'wms' && style?.legendURL) {
            return `<img class="" src="${style?.legendURL}" alt="Image not found.">`
        }
    }

    handleRemoveLayer() {
        let timeout
        
        this.map.on('layerremoved', (e) => {
            Array.from(this.legendContainer.querySelectorAll(`[data-layer-name]`))
            .find(el => e.layerId.startsWith(el.dataset.layerName))?.remove()
            
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                this.updateSettings()
            }, 100)
        })
    }

    toggleLegendVisibility({layer}={}) {
        const map = this.map
        
        const handler = (layer) => {
            const layerName = Array(layer.source, layer.metadata.name).join('-')
            const container = this.legendContainer.querySelector(`[data-layer-name="${layerName}"]`)
            const layerLegend = document.querySelector(`#${container.dataset.layerLegend}`)
            
            const withinBounds = map.bboxToGeoJSON().features.find(f => {
                return turf.booleanIntersects(turf.bboxPolygon(layer.metadata.params.bbox), f)
            })
        
            layerLegend.classList.toggle('d-none', (
                !withinBounds
            ))

            container.querySelector(`.bi-slash-square`).classList.toggle('d-none', withinBounds)
        }

        if (layer) {
            handler(layer)
        } else {
            Array.from(this.legendContainer.querySelectorAll(`[data-layer-name]`)).forEach(c => {
                handler(map.sourcesHandler.getLayersByName(c.dataset.layerName).pop())
            })
        }
    }

    setSourceData(layer) {
        const type = layer.metadata.params.type
        if (type === 'wfs') {

        }
    }

    handleEvents() {
        this.map.on('moveend', (e) => {
            this.toggleLegendVisibility()
        })

        this.map.on('layeradded', (e) => {
        
        })

        this.map.on('layerupdated', (e) => {
        
        })
    }

    onAdd(map) {
        this.map = map
        this._container = customCreateElement({
            className:'maplibregl-ctrl maplibregl-ctrl-group'
        })

        const button = this.control = customCreateElement({
            tag:'button',
            parent: this._container,
            className: 'fs-16 d-none',
            attrs: {
                type: 'button',
                title: 'Show legend'
            },
            innerHTML: `<i class="bi bi-stack"></i>`,
            events: {
                click: (e) => {
                    button.classList.add('d-none')
                    this.legendCollapse.classList.remove('d-none')
                }
            }
        })

        this.createLegendContainer()
        this.handleAddLayer()
        this.handleRemoveLayer()
        this.handleEvents()

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}