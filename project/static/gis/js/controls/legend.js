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
            style: { maxHeight: `65vh` }
        })

        return container
    }

    updateSettings() {
        const map = this.map
        const settings = map._settings
        const layers = map.getStyle().layers
        const sourcesHandler = map.sourcesHandler
        const excludedPrefix = [
            ...sourcesHandler.config.systemOverlays,
            ...sourcesHandler.config.baseLayers,
        ]

        const legendSources = {}
        const legendLayers = {}

        layers.forEach(layer => {
            if (excludedPrefix.find(prefix => layer.id.startsWith(prefix))) return
            const source = map.getSource(layer.source)
            legendSources[layer.source] = source.metadata
            legendLayers[`${layer.source}-${layer.metadata.name}`] = layer.metadata
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

            const container = customCreateElement({
                parent: this.legendContainer,
                className: 'd-flex flex-column gap-2',
                attrs: {
                    'data-layer-id': Array(layer.source, layer.metadata.name).join('-')
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

            const remove = customCreateElement({
                parent: menu,
                tag: 'li',
                className: 'dropdown-item fs-12',
                innerText: 'Remove',
                events: {
                    click: (e) => {
                        map.removeLayer(layer.id)
                    }
                }
            })

            const body = customCreateElement({
                parent: collapse,
                className: 'd-flex flex-column gap-2'
            })

            const legend = customCreateElement({
                parent: body,
                innerHTML: this.getLayerLegend(layer)
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

        if (params.type === 'xyz') {
            return `<img class="" src="${params.styles[params.style].thumbnail}" alt="Image not found." height="100">`
        }

        if (params.type === 'wms') {
            return `<img class="" src="${params.styles[params.style].legendURL}" alt="Image not found.">`
        }
    }

    handleRemoveLayer() {
        const map = this.map
        map.on('layerremoved', (e) => {
            const container = Array.from(this.legendContainer.querySelectorAll(`[data-layer-id]`))
            .find(el => e.layerId.startsWith(el.dataset.layerId))
            if (container) {
                container.remove()
                this.updateSettings()
            }
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

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}