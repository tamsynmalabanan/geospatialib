class SettingsControl {
    constructor(options={}) {
        this.settings = null
    }

    createHillshadeForm(config, {dismissible=false}={}) {
        const container = customCreateElement({
            className: 'd-flex gap-3 flex-wrap align-items-end'
        })

        let name = `hillshade-illumination-direction`
        const direction = createFormControl({
            parent: container,
            labelInnerText: 'Direction',
            inputAttrs: {
                name,
                type: 'number',
                max: 360,
                min: 0,
                step: 15,
                value: config[name]
            }
        }).querySelector('input')

        name = `hillshade-illumination-altitude`
        const altitude = createFormControl({
            parent: container,
            labelInnerText: 'Altitude',
            inputAttrs: {
                name,
                type: 'number',
                max: 90,
                min: 0,
                step: 15,
                value: config[name]
            }
        }).querySelector('input')

        name = `hillshade-highlight-color`
        const highlight = createFormControl({
            parent: container,
            labelInnerText: 'Highlight',
            inputAttrs: {
                name,
                type: 'color',
                value: config[name]
            }
        }).querySelector('input')

        name = `hillshade-shadow-color`
        const shadow = createFormControl({
            parent: container,
            labelInnerText: 'Shadow',
            inputAttrs: {
                name,
                type: 'color',
                value: config[name]
            }
        }).querySelector('input')

        if (dismissible) {
            customCreateElement({
                parent: container,
                children: [
                    customCreateElement({
                        tag: 'button',
                        className: 'btn btn-sm btn-danger bi bi-x',
                        events: {
                            click: (e) => container.remove()
                        }
                    })
                ]
            })
        }

        return container
    }

    updateSettings() {
        const settings =  JSON.stringify(this.settings)

        if (this.mapId) {

        } else {
            localStorage.setItem('mapSettings', settings)
        }
    }

    applySettings() {
        this.map.setProjection({type:this.settings.projection})
        
        if (this.settings.terrain) {
            this.map.getContainer()
            .querySelector(`.maplibregl-ctrl-terrain`)
            ?.click()
        }
    }

    configSettingsControl() {

        this._container = customCreateElement({className: 'maplibregl-ctrl maplibregl-ctrl-group'})

        const theme = getPreferredTheme()

        const dropdown = customCreateElement({
            parent: this._container,
            className: 'btn-group dropup'
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
            className: 'dropdown-menu',
            events: {   
                click: (e) => {
                    e.stopPropagation()
                }
            }
        })

        const sections = this.sections = customCreateElement({
            parent: menu,
            className: 'd-flex flex-column gap-3'
        })


        const settings = {
            projection: {
                title: 'Projection',
                radio: true,
                handler: (e, {name}={}) => {
                    this.settings.projection = name
                    this.map.setProjection({type:name})
                    this.updateSettings()                       
                },
                options: {
                    mercator: {
                        title: 'Web Mercator',
                        icon: '🗺️',
                        checked: this.settings.projection !== 'globe',
                    },
                    globe: {
                        title: '3D Globe',
                        icon: '🌍',
                        checked: this.settings.projection === 'globe'
                    },
                }
            },
            popup: {
                title: 'Popup',
                handler: (e) => {
                    const section = e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                    const active = section.querySelector('input[name="popup-active"]')
                    const osm = section.querySelector('input[name="popup-osm"]')
                    const layers = section.querySelector('input[name="popup-layers"]')
                    
                    osm.disabled = !active.checked
                    layers.disabled = !active.checked

                    const config = this.settings.interactions.info
                    config.active = active.checked
                    config.targets.osm = osm.checked
                    config.targets.layers = layers.checked

                    this.map.interactionsHandler.configCursor()

                    this.updateSettings()
                },
                options: {
                    active: {
                        title: 'Toggle popup',
                        icon: 'ℹ️',
                        checked: this.settings.interactions.info.active,
                    },
                    layers: {
                        title: 'Layers',
                        icon: '📚',
                        checked: this.settings.interactions.info.targets.layers,
                        disabled: !this.settings.interactions.info.active,
                    },
                    osm: {
                        title: 'Openstreetmap',
                        icon: '🗾',
                        checked: this.settings.interactions.info.targets.osm,
                        disabled: !this.settings.interactions.info.active,
                    },
                }
            },
            hillshade: {
                title: 'Hillshade',
                handler: (e) => {
                    const section = e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                    const active = section.querySelector('input[name="hillshade-active"]')
                    const multidirectional = section.querySelector('input[name="hillshade-multidirectional"]')
                    
                    Array(
                        multidirectional, 
                        section.querySelector('input[name="hillshade-more"]')
                    ).forEach(el => el.disabled = !active.checked)

                    const config = this.settings.hillshade
                    config.render = active.checked
                    config.method = multidirectional.checked ? 'multidirectional' : 'standard'
                    
                    this.updateSettings()
                    
                    this.configHillshade()
                },
                options: {
                    active: {
                        title: 'Toggle hillshade',
                        icon: '⛰️',
                        checked: this.settings.hillshade.render,
                    },
                    multidirectional: {
                        title: 'Multidirectional hillshade',
                        icon: '↔️',
                        checked: this.settings.hillshade.method === 'multidirectional',
                        disabled: !this.settings.hillshade.render
                    },
                    more: {
                        title: 'More hillshade options',
                        icon: '🎚️',
                        disabled: !this.settings.hillshade.render,
                        handler: (e) => {
                            e.target.checked = false

                            const modalId = `hillshadeOptionsModal`
                            document.querySelector(`#${modalId}`)?.remove()
                            
                            const config = this.settings.hillshade

                            const modal = createModal({
                                modalId,
                                titleInnerText: 'Hillshade options',
                                isStatic: true,
                            })

                            const body = modal.querySelector('.modal-body')
                            body.classList.add('d-flex','flex-column','gap-4')

                            const baseSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-3 flex-wrap'
                            })

                            const methodSelect = createFormSelect({
                                parent: baseSection,
                                labelInnerText: 'Method',
                                selected: config.method,
                                options: {
                                    'standard': 'Standard',
                                    'multidirectional': 'Multidirectional',
                                }
                            }).querySelector('select')

                            const exagInput = createFormControl({
                                parent: baseSection,
                                labelInnerText: 'Exaggeration',
                                inputAttrs: {
                                    type: 'number',
                                    max: 1,
                                    min: 0,
                                    step: 0.1,
                                    value: config.exaggeration
                                }
                            }).querySelector('input')

                            const accentInput = createFormControl({
                                parent: baseSection,
                                labelInnerText: 'Accent',
                                inputAttrs: {
                                    type: 'color',
                                    value: config.accent
                                },
                            }).querySelector('input')

                            const standardSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const standardHeader = customCreateElement({
                                parent: standardSection,
                                className: 'fw-bold',
                                innerText: 'Standard hillshade'
                            })

                            standardSection.appendChild(this.createHillshadeForm(config.standard), {
                                name: 'standard',
                            })

                            const multiSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const multiHeader = customCreateElement({
                                parent: multiSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const multiTitle = customCreateElement({
                                parent: multiHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'Multidirectional hillshade'
                            })

                            const multiOptions = customCreateElement({
                                parent: multiHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const addMulti = customCreateElement({
                                parent: multiOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-success bi bi-plus-lg',
                                events: {
                                    click: (e) => {
                                        multiFields.insertBefore(
                                            this.createHillshadeForm(config.standard, {dismissible:true,}),
                                            multiFields.firstChild
                                        )
                                    }
                                }
                            })

                            const resetMulti = customCreateElement({
                                parent: multiOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                innerText: 'Reset',
                                events: {
                                    click: (e) => {
                                        multiFields.innerHTML = ''

                                        const multiConfig = MAP_DEFAULTS.settings.hillshade.multidirectional
                                        Object.keys(multiConfig[hillshadeParams[0]]).forEach(i => {
                                            multiFields.appendChild(this.createHillshadeForm(Object.fromEntries(hillshadeParams.map(name => {
                                                return [name, multiConfig[name][i]]
                                            })), {dismissible:true,}))
                                        })
                                    }
                                }
                            })

                            const multiFields = customCreateElement({
                                parent: multiSection,
                                className: 'd-flex gap-3 flex-column',
                            })

                            const multiConfig = config.multidirectional
                            const hillshadeParams = Object.keys(multiConfig)

                            Object.keys(multiConfig[hillshadeParams[0]]).forEach(i => {
                                multiFields.appendChild(this.createHillshadeForm(Object.fromEntries(hillshadeParams.map(name => {
                                    return [name, multiConfig[name][i]]
                                })), {dismissible:true,}))
                            })

                            const saveBtn = modal.querySelector(`.modal-footer > button[data-bs-dismiss='modal']`)
                            saveBtn.removeAttribute('data-bs-dismiss')
                            saveBtn.innerText = 'Apply changes'
                            saveBtn.addEventListener('click', () => {
                                config.method = methodSelect.value
                                e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                                .querySelector('input[name="hillshade-multidirectional"]')
                                .checked = config.method === 'multidirectional'

                                config.exaggeration = parseFloat(exagInput.value)
                                config.accent = accentInput.value

                                hillshadeParams.forEach(name => {
                                    const selector = `input[name="${name}"]`
                                    const isColor = name.endsWith('-color')

                                    const value = standardSection.querySelector(selector).value
                                    config.standard[name] = isColor ? value : parseFloat(value)

                                    config.multidirectional[name] = Array.from(multiFields.querySelectorAll(selector)).map(el => {
                                        return isColor ? el.value : parseFloat(el.value)
                                    })
                                })

                                this.configHillshade()

                                this.updateSettings()
                            })
                        }
                    },
                }
            },
            bookmark: {
                title: 'Bookmark',
                options: {
                    set: {
                        title: 'Bookmark current view',
                        icon: '➕',
                        handler: (e) => {
                            e.target.checked = false
                            
                            const config = this.settings.bookmark
                            config.zoom = this.map.getZoom()
                            config.center = this.map.getCenter()
                            config.pitch = this.map.getPitch()
                            config.bearing = this.map.getBearing()

                            this.updateSettings()
                        }
                    },
                    zoom: {
                        title: 'Zoom to bookmarked view',
                        icon: '🔍',
                        handler: (e) => {
                            e.target.checked = false
                            this.map.jumpTo(this.settings.bookmark)
                        }
                    }
                }
            },
            misc: {
                title: 'Miscellaneous',
                options: {
                    tooltip: {
                        title: 'Toggle tooltip',
                        icon: '💬',
                        checked: this.settings.interactions.tooltip.active,
                        handler: (e) => {
                            this.settings.interactions.tooltip.active = e.target.checked
                            this.map.interactionsHandler.configCursor()
                            this.updateSettings()
                        }
                    }
                }
            }
        }

        Object.entries(settings).forEach(([section, params]) => {
            const container = customCreateElement({
                parent: sections,
                className: 'd-flex flex-column gap-2 px-2'
            })

            const body = customCreateElement({
                className: 'collapse show',
            })

            const header = customCreateElement({
                parent: container,
                innerText: params.title.toUpperCase(),
                className: 'fs-12 fw-bold',
                attrs: {
                    'data-bs-toggle': 'collapse',
                    'data-bs-target': `#${body.id}`,
                    'aria-expanded': 'true',
                }
            })

            container.appendChild(body)

            const options = customCreateElement({
                parent: body,
                className: 'd-flex flex-wrap gap-1'
            })

            Object.entries(params.options).forEach(([name, option]) => {
                const type = option.type ?? (params.radio ? 'radio' : 'checkbox')
                const isSelect = type === 'select'
                const isCheck = Array('radio', 'checkbox').includes(type)

                const field = customCreateElement({
                    parent: options,
                    className: isCheck ? '' : 'd-flex flex-column gap-1 w-100'
                })

                const input = customCreateElement({
                    tag: isSelect ? 'select' : 'input',
                    attrs: {
                        type,
                        value: name,
                        name: params.radio ? section : Array(section, name).join('-'),
                        ...(option.checked ? {checked: true} : {}),
                        ...(option.disabled ? {disabled: true} : {}),
                        ...option.attrs ?? {},
                    },
                    style: option.style,
                    className: (
                        isCheck ? 'btn-check' 
                        : `fs-12 ${
                            type === 'select' 
                            ? `form-select form-select-sm` 
                            : `form-control form-control-sm`
                        }`
                    ),
                    events: {
                        change: (e) => {
                            params.handler?.(e, {section, params, name, option})
                            option.handler?.(e, {section, params, name, option})
                        }
                    }
                })

                if (isCheck) {
                    field.appendChild(input)
                    const label = customCreateElement({
                        tag: 'label',
                        parent: field,
                        className: `btn btn-sm btn-${theme}`,
                        attrs: {
                            title: option.title,
                            for: input.id,
                        },
                        innerText: option.icon,
                    })
                } else {
                    const label = customCreateElement({
                        tag: 'label',
                        parent: field,
                        className: `fs-12`,
                        attrs: {
                            for: input.id,
                        },
                        innerText: option.title,
                    })
                    field.appendChild(input)
                }
            })
        })
    }

    configHillshade(){
        const map = this.map
        const config = this.settings.hillshade

        if (map.getLayer('hillshade')) {
            map.removeLayer('hillshade')
        }
        
        const source = map.getTerrain()?.source
        if (source && config.render) {
            map.addLayer({
                id: 'hillshade',
                type: 'hillshade',
                source,
                paint: {
                    'hillshade-method': config.method,
                    'hillshade-exaggeration': config.exaggeration,
                    'hillshade-accent-color': config.accent,
                    ...config[config.method]
                }
            }, map.sourcesHandler.getBeforeId('hillshade'))
        }
    }

    onAdd(map) {
        this.map = map
        this.map._settings = this

        this.mapId = this.map.getContainer().dataset.mapId
        this.settings = this.map.controlsHandler.settings
        
        this.applySettings()
        this.configSettingsControl()
        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container)
        this.map = undefined
    }
}