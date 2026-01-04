class LegendControl {
    createControl() {
        const collapse = customCreateElement({
            parent: this.container,
            className: `position-absolute top-0 end-0 text-bg-${getPreferredTheme()} rounded border border-2 border-secondary border-opacity-25 collapse collapse-top-right show`,
            events: {
                'show.bs.collapse': (e) => {
                    if (e.target !== collapse) return
                    toggle.classList.add('d-none')
                },
                'hide.bs.collapse': (e) => {
                    if (e.target !== collapse) return
                    toggle.classList.remove('d-none')
                },
            }
        })
        
        const content = customCreateElement({
            parent: collapse,
            className: `d-flex flex-column gap-1 p-2 gap-2`,
            style: {
                maxWidth: `70vw`,
                maxHeight: `60vh`,
            },
        })
        
        const header = customCreateElement({
            parent: content,
            className: `d-flex align-items-center gap-2`,
            style: {minWidth: '240px'}
        })
        
        const title = customCreateElement({
            tag: 'span',
            parent: header,
            className: `me-5 fw-bold`,
            innerText: 'Legend'
        })
        
        const menuCollapse = customCreateElement({
            parent: content,
            className: 'collapse show',
        })

        const menuContent = this.menu = customCreateElement({
            parent: menuCollapse,
            className: `d-flex flex-wrap gap-2`,
        })

        const menuBtns = {
            section1: {
                visibility: {
                    className: `bi bi-eye`,
                    events: {
                        click: (e) => {
                            const legendContainers = Array.from(layers.querySelectorAll(`[data-map-layer-id]`))
                            const visibility = legendContainers.some(el => this.map.getLayoutProperty(el.getAttribute('data-map-layer-id'), 'visibility') === 'none') ? 'visible' : 'none'
                            legendContainers.forEach(el => {
                                this.map.setLayoutProperty(el.getAttribute('data-map-layer-id'), 'visibility', visibility)
                                el.lastElementChild.classList.toggle('d-none', visibility === 'none')
                            })
        
                        }
                    },
                },
                zoomin: {
                    className: `bi bi-zoom-in`,
                    events: {
                        click: () => {
                            const legendContainers = Array.from(layers.querySelectorAll(`[data-map-layer-id]`))
                            const geojson = turf.featureCollection([])
                            legendContainers.forEach(el => {
                                const layer = this.map.getLayer(el.getAttribute('data-map-layer-id'))
                                const bbox = this.map._settingsControl.getLayerBbox(layer)
                                if (!bbox) return
                                geojson.features.push(turf.bboxPolygon(bbox))
                            })
                            this.map.fitBounds(turf.bbox(geojson), {padding:100, maxZoom:11})
                        }
                    },
                }
            },
            section2: {
                clear: {
                    className: `bi bi-trash`,
                    events: {
                        click: (e) => {
                            Array.from(layers.querySelectorAll(`[data-map-layer-id]`)).forEach(el => this.map.removeLayer(el.getAttribute('data-map-layer-id')))
                        }
                    },
                }
            },
        }

        Object.entries(menuBtns).forEach(([section, btns]) => {
            const sectionContainer = customCreateElement({
                parent: menuContent,
                className: 'd-flex flex-nowrap border rounded'
            })

            Object.entries(btns).forEach(([name, params]) => {
                const btn = customCreateElement({
                    ...params,
                    parent: sectionContainer,
                    tag: 'button',
                    attrs: {
                        disabled: true,
                        ...(params.attrs ?? {})
                    },
                    className: `border-top-0 ${params.className}`,
                })

            })
        })
        
        const menuToggle = customCreateElement({
            tag: 'button',
            parent: header,
            className: `ms-auto bi bi-list text-end w-auto h-auto`,
            attrs: {
                type: 'button',
                'data-bs-toggle': 'collapse',
                'data-bs-target': `#${menuCollapse.id}`,
                'aria-controls': menuCollapse.id,
                'aria-expanded': true,
            },
        })
        
        const collapseToggle = customCreateElement({
            tag: 'button',
            parent: header,
            className: `bi bi-x text-end border-0 w-auto h-auto`,
            attrs: {
                type: 'button',
                'data-bs-toggle': 'collapse',
                'data-bs-target': `#${collapse.id}`,
                'aria-controls': collapse.id,
                'aria-expanded': false,
            },
        })

        const toggle = customCreateElement({
            tag: 'button',
            parent: this.container,
            attrs: {
                type: 'button',
                'data-bs-toggle': 'collapse',
                'data-bs-target': `#${collapse.id}`,
                'aria-controls': collapse.id,
                'aria-expanded': true,
            },
            innerText: '📚',
            className: `btn fs-20 rounded-circle text-bg-${getPreferredTheme()} rounded-circle border border-2 border-opacity-50 d-none`,
                style: {
                width:'42px',
                height:'40px',
            }
        })

        const layers = this.layers = customCreateElement({
            parent: content,
            className: 'd-flex flex-column gap-2 pe-2 overflow-y-auto',
        })

        return layers
    }

    getLayerLegend(layer) {
        const metadata = layer.metadata
        const params = metadata?.params
        const type = params?.type
        if (Array('wms').includes(type)) {
            return customCreateElement({
                tag: 'img',
                attrs: {
                    src: JSON.parse(params.styles ?? '{}')[metadata.style]?.legend,
                    alt: params.title,
                }
            })
        }
    }

    addLayerLegend(layer) {
        console.log(layer)
        
        if (this.map._settingsControl.config.fixedLayers.find(i => layer.id.startsWith(i))) return

        let legendContainer = Array.from(this.layers.children).find(el => el.getAttribute('data-map-layer-id').startsWith(Array(layer.source, layer.metadata.name).join('-')))
        if (legendContainer) return

        legendContainer = customCreateElement({
            className: 'd-flex flex-column gap-2',
            attrs: {
                'data-map-layer-id': layer.id
            }
        })
        this.layers.insertBefore(legendContainer, this.layers.firstChild)

        const legendHeader = customCreateElement({
            parent: legendContainer,
            className: 'd-flex align-items-top justify-content-between'
        })

        const legendStyle = customCreateElement({
            parent: legendContainer,
            className: 'collapse show user-select-none',
            innerHTML: this.getLayerLegend(layer)
        })
        
        console.log(layer)

        const legendAttr = customCreateElement({
            parent: legendContainer,
            className: 'collapse show user-select-none text-break text-wrap small',
            innerHTML: layer.metadata.params.attribution
        })

        const legendTitle = customCreateElement({
            parent: legendHeader,
            tag: 'span',
            className: `user-select-none`,
            innerText: layer.metadata?.params?.title ?? layer.metadata?.params?.name ?? 'Untitled',
            attrs: {
                'data-bs-toggle': "collapse",
                'data-bs-target': `#${legendStyle.id}`,
                'aria-expanded': "true",
                'aria-controls': legendStyle.id,
            }
        })

        const legendMenuToggle = customCreateElement({
            parent: legendHeader,
            tag: 'button',
            className: 'bi bi-three-dots ms-5',
            attrs: {
                'data-bs-toggle':"dropdown", 
                'aria-expanded':"false",
            }
        })

        const legendMenu = customCreateElement({
            parent: legendHeader,
            tag: 'ul',
            className: 'dropdown-menu user-select-none'
        })

        const layerMenu = {
            section1: {
                visibility: {
                    innerHTML: 'Hide layer',
                    events: {
                        click: (e) => {
                            const visibility = this.map.getLayoutProperty(layer.id, 'visibility') === 'none' ? 'visible' : 'none'
                            this.map.setLayoutProperty(layer.id, 'visibility', visibility)
                            e.target.innerHTML = `${visibility === 'visible' ? 'Hide' : 'Show'} layer`
                            legendStyle.classList.toggle('d-none', visibility === 'none')
                        },
                    },
                    handlers: {
                        rename: (el) => {
                            this.map.on('styledata', (e) => {
                                if (!this.map.getLayer(layer.id)) return
                                el.innerHTML = this.map.getLayoutProperty(layer.id, 'visibility') === 'none' ? 'Show layer' : 'Hide layer'
                            })
                        }
                    }
                },
                zoomin: {
                    innerHTML: 'Zoom to layer',
                    events: {
                        click: () => {
                            const bbox = this.map._settingsControl.getLayerBbox(layer)
                            if (!bbox) return
                            this.map.fitBounds(bbox, {padding:100, maxZoom:11})
                        },
                    },
                },
            },
            section2: {
                remove: {
                    innerHTML: 'Remove layer',
                    events: {
                        click: (e) => {
                            this.map.removeLayer(layer.id)
                        }
                    }
                },
            },
        }

        Object.entries(layerMenu).forEach(([section, items]) => {
            Object.entries(items).forEach(([name, params]) => {
                const li = customCreateElement({
                    parent: legendMenu,
                    tag: 'li',
                    className: 'dropdown-item fs-12',
                    ...params,
                })
            })

            customCreateElement({
                parent: legendMenu,
                tag: 'li',
                innerHTML: `<hr class="dropdown-divider">`
            })
        })

        legendMenu.lastElementChild.remove()

        this.toggleMenuBtns()
    }

    toggleMenuBtns() {
        const disable = this.layers.innerHTML === ''
        Array.from(this.menu.querySelectorAll(`button`)).forEach(el => el.disabled = disable)
    }

    removeLayerLegend(layerId) {
        this.layers.querySelector(`[data-map-layer-id="${layerId}"]`)?.remove()
        this.toggleMenuBtns()
    }

    onAdd(map) {
        this.map = map
        this.container = customCreateElement({
            className:`maplibregl-ctrl maplibregl-ctrl-group bg-transparent d-flex justify-content-center align-items-center border-0`,
            style: { boxShadow: 'none' }
        })

        this.createControl()
        this.map.on('layeradded', (e) => this.addLayerLegend(e.layer))
        this.map.on('layerremoved', (e) => this.removeLayerLegend(e.layerId))

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}
