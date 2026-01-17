class SettingsControl {
    constructor(options={}) {
        this.config = {
            projection: 'mercator',
            settings: {
                protections: {
                    title: 'Projection',
                    radio: true,
                    handler: (e, {name}={}) => {
                        this.setProjection({type: name})
                    },
                    options: {
                        mercator: {
                            title: 'Web Mercator',
                            icon: '🗺️',
                            checked: true,
                        },
                        globe: {
                            title: '3D Globe',
                            icon: '🌍',
                        },
                    }
                },
                popup: {
                    title: 'Popup',
                    handler: (e) => {
                        const section = e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                        const toggle = section.querySelector('input[name="popup-toggle"]')
                        const osm = section.querySelector('input[name="popup-osm"]')
                        const layers = section.querySelector('input[name="popup-layers"]')
                        
                        const interactionsHandler = this.map.interactionsHandler
                        const config = interactionsHandler.config.interactions.info

                        config.active = toggle.checked
                        config.targets.osm = osm.checked
                        config.targets.layers = layers.checked
                        
                        osm.disabled = !toggle.checked
                        layers.disabled = !toggle.checked

                        interactionsHandler.configCursor()
                    },
                    options: {
                        toggle: {
                            title: 'Toggle popup',
                            icon: '💬',
                            checked: true,
                        },
                        layers: {
                            title: 'Layers',
                            icon: '📚',
                            checked: true,
                        },
                        osm: {
                            title: 'Openstreetmap',
                            icon: '🗾',
                            checked: true,
                        },
                    }
                },
                hillshade: {
                    title: 'Hillshade',
                    handler: (e) => {
                        const controlsHandler = this.map.controlsHandler
                        const config = controlsHandler.config.hillshade
                        
                        const section = e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                        const toggle = section.querySelector('input[name="hillshade-toggle"]')
                        const multidirectional = section.querySelector('input[name="hillshade-multidirectional"]')
                        
                        config.render = toggle.checked
                        config.method = multidirectional.checked ? 'multidirectional' : 'standard'

                        controlsHandler.configHillshade()

                        Array(
                            multidirectional, 
                            section.querySelector('input[name="hillshade-more"]')
                        ).forEach(el => el.disabled = !toggle.checked)
                    },
                    options: {
                        toggle: {
                            title: 'Toggle hillshade',
                            icon: '⛰️',
                            checked: true,
                        },
                        multidirectional: {
                            title: 'Multidirectional hillshade',
                            icon: '↔️',
                            checked: false,
                        },
                        more: {
                            title: 'More hillshade options',
                            icon: '⚙️',
                            checked: false,
                            handler: (e) => {
                                e.target.checked = false

                                const modalId = `hillshadeOptionsModal`
                                document.querySelector(`#${modalId}`)?.remove()
                                
                                const controlsHandler = this.map.controlsHandler
                                const config = controlsHandler.config.hillshade

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
                                    className: 'fw-bold',
                                    innerText: 'Multidirectional hillshade'
                                })

                                const multiFields = customCreateElement({
                                    parent: multiSection,
                                    className: 'd-flex gap-2 flex-column',
                                })

                                const multiConfig = config.multidirectional
                                const hillshadeParams = Object.keys(multiConfig)

                                Object.keys(multiConfig[hillshadeParams[0]]).forEach(i => {
                                    multiFields.appendChild(this.createHillshadeForm(Object.fromEntries(hillshadeParams.map(name => {
                                        return [name, multiConfig[name][i]]
                                    })), {dismissible:true,}))
                                })

                                const btnContainer = customCreateElement({
                                    parent: multiSection,
                                    className: 'py-2 d-flex flex-wrap gap-3'
                                })

                                const addMulti = customCreateElement({
                                    parent: btnContainer,
                                    tag:'button',
                                    className: 'btn-sm btn btn-success bi bi-plus-lg d-flex gap-2 align-items-center',
                                    innerText: 'Add to multidirectional hillshade',
                                    events: {
                                        click: (e) => {
                                            multiFields.appendChild(this.createHillshadeForm(config.standard, {dismissible:true,}))
                                        }
                                    }
                                })

                                const resetMulti = customCreateElement({
                                    parent: btnContainer,
                                    tag:'button',
                                    className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise d-flex gap-2 align-items-center',
                                    innerText: 'Reset',
                                    events: {
                                        click: (e) => {
                                            multiFields.innerHTML = ''

                                            const multiConfig = MAP_DEFAULTS.hillshade.multidirectional
                                            Object.keys(multiConfig[hillshadeParams[0]]).forEach(i => {
                                                multiFields.appendChild(this.createHillshadeForm(Object.fromEntries(hillshadeParams.map(name => {
                                                    return [name, multiConfig[name][i]]
                                                })), {dismissible:true,}))
                                            })
                                        }
                                    }
                                })

                                const saveBtn = modal.querySelector(`.modal-footer > button[data-bs-dismiss='modal']`)
                                saveBtn.innerText = 'Save changes'
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

                                    controlsHandler.configHillshade()
                                })
                            }
                        },
                    }
                }

            }
        }
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

    configSettings() {
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

        Object.entries(this.config.settings).forEach(([section, params]) => {
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
                        name: params.radio ? section : Array(section, name).join('-'),
                        ...(option.checked ? {checked: true} : {}),
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

    setProjection({type='mercator'}={}) {
        this.map.setProjection({type})
        this.config.projection = type
    }

    getProjection() {
        return this.config.projection
    }

    onAdd(map) {
        this.map = map
        this._container = customCreateElement({className: 'maplibregl-ctrl maplibregl-ctrl-group'})
        this.configSettings()
        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container)
        this.map = undefined
    }
}