class LegendControl {
    constructor(options={}) {
        this.config = {
            updateGeoJSONDataMap: new Map(),
        }
    }

    createLegendContainer() {
        const container = this.legendCollapse =  customCreateElement({
            parent: this._container,
            className: 'p-0',
            // style: {
            //     maxWidth: `85vw`,
            // }
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
            className: 'd-flex flex-column flex-nowrap flex-sm-wrap column-gap-4 row-gap-3 overflow-y-auto px-3 pb-2',
            style: { maxHeight: `65vh`, maxWidth: `85vw` }
        })

        return container
    }

    getLegendLayers() {
        return this.map.getStyle().layers.filter(layer => {
            return !this.map.sourcesHandler.isSystemLayer({layer})
        })
    }

    getLegendContainers() {
        return Array.from(this.legendContainer.querySelectorAll(`[data-layer-name]`))
    }

    handleSettingsUpdate() {
        let timeout

        Array('layeradded', 'layerupdated', 'layerremoved').forEach(i => {
            this.map.on(i, (e) => {
                const id = e.layerId ?? e.layer.id
                if (this.map.sourcesHandler.isSystemLayer({id})) return

                clearTimeout(timeout)
                timeout = setTimeout(() => {
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
                }, 1000)
            })
        })
    }

    handleAddLayer() {
        const map = this.map
        map.on('layeradded', async (e) => {
            const layer = e.layer
            const params = layer.metadata?.params
            if (!params) return

            const layerName = Array(layer.source, layer.metadata.name).join('-')
            let container = this.getLegendContainers().find(c => c.dataset.layerName === layerName) 
            if (container) return

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
                className: `bi bi-slash-square text-secondary d-none`,
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
                className: 'd-none',
                innerHTML: await this.getLayerLegend(layer),
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

            this.toggleLegendVisibility(container)
            this.updateGeoJSONData(layer.source)
        })
    }

    async getLayerLegend(layer) {
        const params = layer.metadata.params
        const style = params.styles[params.style]
        const layerName = Array(layer.source, layer.metadata.name).join('-')

        if (params.type === 'xyz' && style.thumbnail) {
            return `<img class="" src="${style.thumbnail}" alt="Image not found." height="21" width="30">`
        }

        if (params.type === 'wms' && style?.legendURL) {
            return `<img class="" src="${style?.legendURL}" alt="Image not found.">`
        }

        const source = this.map.getStyle().sources[layer.source]
        if (source.type === 'geojson') {
            const geojson = source.data

            const container = customCreateElement({
                className: 'd-flex flex-column gap-2'
            })

            const groups = Object.entries(layer.metadata.groups)

            if (groups.length > 1) {
                const header = customCreateElement({
                    parent: container,
                    className: 'd-flex gap-2'
                })
    
                const headerTitle = customCreateElement({
                    parent: header,
                    innerText: ''
                })
    
                const headerCount = customCreateElement({
                    parent: header,
                    innerText: `(${geojson.features.length})`
                })
            }

            const groupsContainer = customCreateElement({
                parent: container,
                className: 'd-flex flex-column gap-2'
            })

            for (const [name, group] of groups) {
                console.log(group)

                const groupContainer = customCreateElement({
                    parent: groupsContainer,
                    className: 'd-flex gap-2'
                })

                const symbolContainer = customCreateElement({
                    parent: groupContainer,
                    className: 'd-flex gap-2'
                })

                const groupTitle = customCreateElement({
                    parent: groupContainer,
                    innerText: group.title ?? name
                })

                const groupCount = customCreateElement({
                    parent: groupContainer,
                })

                const features = group.filter ? geojson.features : geojson.features
            
                console.log(features)

                groupCount.innerText = `(${features?.length ?? 0})`
            }
            
            return container.outerHTML
        }

        return ''
    }

    handleRemoveLayer() {
        this.map.on('layerremoved', (e) => {
            this.getLegendContainers().find(el => e.layerId.startsWith(el.dataset.layerName))?.remove()
        })
    }

    toggleLegendVisibility = (container) => {
        const layer = this.map.sourcesHandler.getLayersByName(container.dataset.layerName).pop()
        const layerLegend = document.querySelector(`#${container.dataset.layerLegend}`)
        
        const withinBounds = this.map.bboxToGeoJSON().features.find(f => {
            return turf.booleanIntersects(turf.bboxPolygon(layer.metadata.params.bbox), f)
        }) ?? false
    
        layerLegend.classList.toggle('d-none', !withinBounds)

        container.querySelector(`.bi-slash-square`).classList.toggle('d-none', withinBounds)
    }

    handleMoveend() {
        const map = this.map
        map.on('moveend', (e) => {
            this.getLegendContainers().forEach(container => {
                this.toggleLegendVisibility(container)
            })
            
            Array.from(new Set(this.getLegendLayers().map(l => map.getSource(l.source))))
            .filter(s => s.type === 'geojson').forEach(s => {
                this.updateGeoJSONData(s.id)
            })
        })
    }

    async updateGeoJSONData(id) {
        const map = this.map
        const source = map.getSource(id)

        if (source.type !== 'geojson') return
        
        if (this.config.updateGeoJSONDataMap.has(id)) {
            return
        } else {
            this.config.updateGeoJSONDataMap.set(id, null)
        }

        const params = source.metadata.params
        const type = params.type

        let data = turf.featureCollection([])

        if (type === 'wfs') {
            data = await fetchWFSData(params, {map, id})
        }

        map.once('idle', async (e) => {
            for (const container of this.getLegendContainers()) {
                const layerName = container.dataset.layerName
                if (!layerName.startsWith(id)) continue
    
                const layer = map.sourcesHandler.getLayersByName(layerName).pop()
                const layerLegend = container.querySelector(`#${container.dataset.layerLegend}`)
                layerLegend.innerHTML = await this.getLayerLegend(layer)
            }
        })

        source.setData(data)

        this.config.updateGeoJSONDataMap.delete(id)
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
        this.handleSettingsUpdate()
        this.handleMoveend()

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}