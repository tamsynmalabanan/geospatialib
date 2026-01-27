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

    createTileSourceForm(url, {dismissible=true}={}) {
        const container = customCreateElement({
            className: 'd-flex gap-3 flex-wrap align-items-end'
        })

        const sourceInput = createFormControl({
            parent: container,
            labelInnerText: 'URL',
            inputAttrs: {
                type: 'url',
                name: 'source',
                value: url
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

    createBasemapStyleForm(config) {
        const container = customCreateElement({
            className: 'd-flex gap-3 flex-wrap align-items-end'
        })

        Object.entries(config).forEach(([name, value]) => {
            const labelInnerText = toTitleCase(name.replaceAll('-', ' '))
            
            if (Array('opacity', 'blend').some(i => name.includes(i))) {
                createFormControl({
                    parent: container,
                    labelInnerText,
                    inputAttrs: {
                        type: 'number',
                        min: 0,
                        max: 1,
                        step: 0.1,
                        name,
                        value,
                    }
                }).querySelector('input')
            }
            
            if (Array('brightness').some(i => name.includes(i))) {
                createFormControl({
                    parent: container,
                    labelInnerText,
                    inputAttrs: {
                        type: 'number',
                        min: 0,
                        max: 1,
                        step: 0.001,
                        name,
                        value,
                    }
                }).querySelector('input')
            }
            
            if (Array('saturation', 'contrast').some(i => name.includes(i))) {
                createFormControl({
                    parent: container,
                    labelInnerText,
                    inputAttrs: {
                        type: 'number',
                        min: -1,
                        max: 1,
                        step: 0.001,
                        name,
                        value,
                    }
                }).querySelector('input')
            }
            
            if (Array('resampling').some(i => name.includes(i))) {
                createFormSelect({
                    parent: container,
                    labelInnerText,
                    selected: value,
                    inputAttrs: {name},
                    options: {
                        'linear': 'Linear',
                        'nearest': 'Nearest',
                    }
                }).querySelector('select')
            }
            
            if (Array('hue').some(i => name.includes(i))) {
                createFormControl({
                    parent: container,
                    labelInnerText,
                    inputAttrs: {
                        type: 'number',
                        min: 0,
                        max: 360,
                        step: 15,
                        name,
                        value,
                    }
                }).querySelector('input')
            }
            
            if (Array('color',).some(i => name.includes(i))) {
                createFormControl({
                    parent: container,
                    labelInnerText,
                    inputAttrs: {
                        type: 'color',
                        name,
                        value
                    }
                }).querySelector('input')
            }
        })

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
    
        document.addEventListener('themeToggled', (e) => {
            if (this.settings.basemap.theme !== 'auto') return
            this.configBasemapLayer()
        })

        if (this.settings.bookmark.method !== 'centroid') {
            this.goToBookmark()
        }

        if (this.settings.locked) {
            this.lockMapView()
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
            className: 'd-flex flex-column gap-2 accordion'
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
            unit: {
                title: 'Units',
                radio: true,
                handler: (e, {name}={}) => {
                    this.settings.unit = name
                    this.map.controlsHandler.controls.scalebar.setUnit(name)
                    this.updateSettings()
                },
                options: {
                    metric: {
                        title: 'Metric',
                        icon: '<span class="fs-12 font-monospace">m/km</span>',
                        checked: this.settings.unit === 'metric'
                    },
                    imperial: {
                        title: 'Imperial',
                        icon: '<span class="fs-12 font-monospace">ft/mi</span>',
                        checked: this.settings.unit === 'imperial'
                    },
                    nautical: {
                        title: 'Nautical',
                        icon: '<span class="fs-12 font-monospace">nm</span>',
                        checked: this.settings.unit === 'nautical'
                    },
                }
            },
            // dark and light mode basemap and sky config - paint
            basemap: {
                title: 'Basemap',
                radio: true,
                handler: (e, {name}={}) => {
                    const section = e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                    const render = section.querySelector('input[name="basemap-render"]')

                    const themeRadio = Array.from(section.querySelectorAll(`input[name="basemap"]`))
                    themeRadio.forEach(el => el.disabled = !render.checked)

                    const config = this.settings.basemap
                    config.render = render.checked
                    config.theme = themeRadio.find(i => i.checked).value

                    this.configBasemap()

                    this.updateSettings()
                },
                options: {
                    render: {
                        title: 'Toggle basemap',
                        icon: '🗺️',
                        type: 'checkbox',
                        checked: this.settings.basemap.render,
                    },
                    auto: {
                        title: 'Auto basemap theme',
                        icon: '<span class="font-monospace fs-12">AUTO</span>',
                        checked: this.settings.basemap.theme === 'auto',
                        disabled: ! this.settings.basemap.render,
                    },
                    light: {
                        title: 'Light basemap theme',
                        icon: '🔆',
                        checked: this.settings.basemap.theme === 'light',
                        disabled: ! this.settings.basemap.render,
                    },
                    dark: {
                        title: 'Dark basemap theme',
                        icon: '🌙',
                        checked: this.settings.basemap.theme === 'dark',
                        disabled: ! this.settings.basemap.render,
                    },
                    more: {
                        title: 'Basemap options',
                        icon: '🎚️',
                        type: 'checkbox',
                        handler: (e) => {
                            e.target.checked = false

                            document.querySelector(`.in-map-modal`)?.remove()
                            
                            const config = this.settings.basemap

                            const modal = createModal({
                                titleInnerText: 'Basemap options',
                                isStatic: true,
                            })
                            modal.classList.add('in-map-modal')

                            const body = modal.querySelector('.modal-body')
                            body.classList.add('d-flex','flex-column','gap-4')

                            const baseSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const baseHeader = customCreateElement({
                                parent: baseSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const baseTitle = customCreateElement({
                                parent: baseHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'General'
                            })

                            const baseOptions = customCreateElement({
                                parent: baseHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const defaultBasemap = customCreateElement({
                                parent: baseOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                events: {
                                    click: (e) => {
                                        const defaultBasemap = MAP_DEFAULT_SETTINGS.basemap

                                        themeSelect.value = defaultBasemap.theme
                                        attributionInput.value = defaultBasemap.attribution

                                        sourceFields.innerHTML = ''
                                        Object.entries(defaultBasemap.tiles).forEach(([index, url]) => {
                                            sourceFields.appendChild(this.createTileSourceForm(url, {dismissible:index>0}))
                                        })

                                        evaluateAttribution()
                                    }
                                }
                            })

                            const baseFields = customCreateElement({
                                parent: baseSection,
                                className: 'd-flex gap-2 flex-wrap',
                            })

                            const themeSelect = createFormSelect({
                                parent: baseFields,
                                labelInnerText: 'Theme',
                                selected: config.theme,
                                options: {
                                    'auto': 'Auto',
                                    'light': 'Light',
                                    'dark': 'Dark',
                                }
                            }).querySelector('select')

                            const attributionInput = createFormControl({
                                parent: baseFields,
                                labelInnerText: 'Attribution',
                                inputAttrs: {
                                    type: 'text',
                                    value: config.attribution
                                },
                                invalidFeedbackContent: 'This field is required.',
                            }).querySelector('input')
                            
                            const evaluateAttribution = () => {
                                const isInvalid = attributionInput.value.trim() === ''
                                attributionInput.classList.toggle('is-invalid', isInvalid)
                                saveBtn.disabled = isInvalid
                            }

                            attributionInput.addEventListener('change', evaluateAttribution)

                            const sourceSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const sourceHeader = customCreateElement({
                                parent: sourceSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const sourceTitle = customCreateElement({
                                parent: sourceHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'Tile sources'
                            })

                            const sourceOptions = customCreateElement({
                                parent: sourceHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const addSource = customCreateElement({
                                parent: sourceOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-success bi bi-plus-lg',
                                events: {
                                    click: (e) => {
                                        sourceFields.appendChild(this.createTileSourceForm(''))
                                    }
                                }
                            })

                            const sourceFields = customCreateElement({
                                parent: sourceSection,
                                className: 'd-flex gap-2 flex-column',
                                events: {
                                    'change': (e) => {
                                        const sourceInputs = Array.from(sourceFields.querySelectorAll(`input[name="source"][type="url"]`))
                                        if (!sourceInputs.includes(e.target)) return
                                        if (sourceInputs.find(el => el.value.includes('openstreetmap'))) return
                                        if (attributionInput.value.trim() !== MAP_DEFAULT_SETTINGS.basemap.attribution) return
                                        attributionInput.value = ''
                                        evaluateAttribution()
                                    }
                                }
                            })

                            Object.entries(config.tiles).forEach(([index, url]) => {
                                sourceFields.appendChild(this.createTileSourceForm(url, {dismissible:index>0}))
                            })



                            const styleSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const styleHeader = customCreateElement({
                                parent: styleSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const styleTitle = customCreateElement({
                                parent: styleHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'Styles'
                            })

                            const styleOptions = customCreateElement({
                                parent: styleHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const styleFields = customCreateElement({
                                parent: styleSection,
                                className: 'd-flex gap-3 flex-column',
                            })

                            Object.entries(config.paints).forEach(([themeName, themeParams]) => {
                                const themeContainer = customCreateElement({
                                    parent: styleFields,
                                    className: 'd-flex flex-column gap-4 border p-3 rounded',
                                })

                                const header = customCreateElement({
                                    parent: themeContainer,
                                    className: 'd-flex justify-content-between',
                                })
                                
                                const title = customCreateElement({
                                    parent: header,
                                    className: 'fw-medium',
                                    innerText: `${toTitleCase(themeName)} theme`
                                })

                                Object.entries(themeParams).forEach(([layerName, layerParams]) => {
                                    const container = customCreateElement({
                                        parent: themeContainer,
                                        className: 'd-flex flex-column gap-2',
                                        attrs: {
                                            'data-style-layer': layerName,
                                            'data-style-theme': themeName,
                                        }
                                    })

                                    const header = customCreateElement({
                                        parent: container,
                                        className: 'd-flex justify-content-between',
                                    })
                                    
                                    const title = customCreateElement({
                                        parent: header,
                                        className: '',
                                        innerText: `${toTitleCase(layerName)}`
                                    })

                                    const options = customCreateElement({
                                        parent: header,
                                        classList: 'd-flex gap-2 felx-nowrap'
                                    })

                                    const defaultStyle = customCreateElement({
                                        parent: options,
                                        tag:'button',
                                        className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                        events: {
                                            click: (e) => {
                                                header.nextElementSibling?.remove()
                                                container.appendChild(this.createBasemapStyleForm(
                                                    MAP_DEFAULT_SETTINGS.basemap.paints[themeName][layerName]
                                                ))
                                            }
                                        }
                                    })

                                    container.appendChild(this.createBasemapStyleForm(layerParams))
                                })
                            })
                            
                            const saveBtn = modal.querySelector(`.modal-footer > button[data-bs-dismiss='modal']`)
                            saveBtn.removeAttribute('data-bs-dismiss')
                            saveBtn.innerText = 'Apply changes'
                            saveBtn.addEventListener('click', () => {
                                config.theme = themeSelect.value
                                Array.from(
                                    e.target.closest(`#${this.sections.id} > div > .collapse > div`)
                                    .querySelectorAll(`input[name="basemap"]`)
                                ).forEach(el => el.checked = el.value === config.theme)

                                config.attribution = attributionInput.value

                                config.tiles = (
                                    Array.from(sourceFields.querySelectorAll(`input[name="source"][type="url"]`))
                                    .map(el => el.value.trim())
                                    .filter(url => {
                                        try {
                                            return new URL(url)
                                        } catch (error) {
                                            return false
                                        }
                                    })
                                )

                                Array.from(styleFields.children).forEach(el => {
                                    Array.from(el.querySelectorAll('input[name]')).forEach(field => {
                                        config.paints[el.dataset.styleTheme][el.dataset.styleLayer][field.getAttribute('name')] = (
                                            field.getAttribute('type') === 'number' ? parseFloat(field.value) : field.value
                                        )
                                    })
                                })

                                this.configBasemap()

                                this.updateSettings()
                            })
                        }
                    }
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
                    
                    this.configHillshade()
                    this.updateSettings()
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
                        title: 'Hillshade options',
                        icon: '🎚️',
                        disabled: !this.settings.hillshade.render,
                        handler: (e) => {
                            e.target.checked = false

                            document.querySelector(`.in-map-modal`)?.remove()
                            
                            const config = this.settings.hillshade

                            const modal = createModal({
                                titleInnerText: 'Hillshade options',
                                isStatic: true,
                            })
                            modal.classList.add('in-map-modal')

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
                                events: {
                                    click: (e) => {
                                        multiFields.innerHTML = ''

                                        const multiConfig = MAP_DEFAULT_SETTINGS.hillshade.multidirectional
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
                        icon: '🔖',
                        handler: (e) => {
                            e.target.checked = false
                            this.settings.bookmark = {
                                ...this.settings.bookmark,
                                ...this.getView()    
                            }
                            this.updateSettings()
                        }
                    },
                    zoom: {
                        title: 'Zoom to bookmarked view',
                        icon: '🔍',
                        handler: (e) => {
                            e.target.checked = false
                            this.goToBookmark()
                        }
                    },
                    more: {
                        title: 'Bookmark options',
                        icon: '🎚️',
                        handler: (e) => {
                            e.target.checked = false

                            document.querySelector(`.in-map-modal`)?.remove()
                            
                            const config = this.settings.bookmark
                            const defaultBookmark = MAP_DEFAULT_SETTINGS.bookmark

                            const modal = createModal({
                                titleInnerText: 'Bookmark options',
                                isStatic: true,
                            })
                            modal.classList.add('in-map-modal')


                            const body = modal.querySelector('.modal-body')
                            body.classList.add('d-flex','flex-column','gap-4')

                            const baseSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const baseHeader = customCreateElement({
                                parent: baseSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const baseTitle = customCreateElement({
                                parent: baseHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'General'
                            })

                            const baseOptions = customCreateElement({
                                parent: baseHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const defaultOrientation = customCreateElement({
                                parent: baseOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                events: {
                                    click: (e) => {
                                        pitchInput.value = defaultBookmark.pitch
                                        bearingInput.value = defaultBookmark.bearing
                                    }
                                }
                            })

                            const currentOrientation = customCreateElement({
                                parent: baseOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-success bi bi-map',
                                events: {
                                    click: (e) => {
                                        const currentView = this.getView()
                                        pitchInput.value = currentView.pitch
                                        bearingInput.value = currentView.bearing
                                    }
                                }
                            })

                            const baseFields = customCreateElement({
                                parent: baseSection,
                                className: 'd-flex gap-2 flex-wrap',
                            })

                            const methodSelect = createFormSelect({
                                parent: baseFields,
                                labelInnerText: 'Method',
                                selected: config.method,
                                options: {
                                    'centroid': 'Centroid',
                                    'bbox': 'Bounding Box',
                                }
                            }).querySelector('select')


                            const pitchInput = createFormControl({
                                parent: baseFields,
                                labelInnerText: 'Pitch',
                                inputAttrs: {
                                    type: 'number',
                                    max: 75,
                                    min: 0,
                                    step: 15,
                                    value: config.pitch
                                }
                            }).querySelector('input')

                            const bearingInput = createFormControl({
                                parent: baseFields,
                                labelInnerText: 'Bearing',
                                inputAttrs: {
                                    type: 'number',
                                    max: 360,
                                    min: 0,
                                    step: 45,
                                    value: config.bearing
                                }
                            }).querySelector('input')

                            
                            
                            const centroidSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const centroidHeader = customCreateElement({
                                parent: centroidSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const centroidTitle = customCreateElement({
                                parent: centroidHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'Centroid'
                            })

                            const centroidOptions = customCreateElement({
                                parent: centroidHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const defaultCenter = customCreateElement({
                                parent: centroidOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                events: {
                                    click: (e) => {
                                        zoomInput.value = defaultBookmark.centroid.zoom
                                        centerLngInput.value = defaultBookmark.centroid.lng
                                        centerLatInput.value = defaultBookmark.centroid.lat
                                    }
                                }
                            })

                            const currentCenter = customCreateElement({
                                parent: centroidOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-success bi bi-map',
                                events: {
                                    click: (e) => {
                                        const currentView = this.getView()
                                        zoomInput.value = currentView.centroid.zoom
                                        centerLngInput.value = currentView.centroid.lng
                                        centerLatInput.value = currentView.centroid.lat
                                    }
                                }
                            })

                            const centroidFields = customCreateElement({
                                parent: centroidSection,
                                className: 'd-flex gap-2 flex-wrap',
                            })

                            const centerLngInput = createFormControl({
                                parent: centroidFields,
                                labelInnerText: 'Longitude',
                                inputAttrs: {
                                    type: 'number',
                                    max: 180,
                                    min: -180,
                                    step: 15,
                                    value: config.centroid.lng
                                }
                            }).querySelector('input')

                            const centerLatInput = createFormControl({
                                parent: centroidFields,
                                labelInnerText: 'Latitude',
                                inputAttrs: {
                                    type: 'number',
                                    max: 90,
                                    min: -90,
                                    step: 15,
                                    value: config.centroid.lat
                                }
                            }).querySelector('input')
                            
                            const zoomInput = createFormControl({
                                parent: centroidFields,
                                labelInnerText: 'Zoom',
                                inputAttrs: {
                                    type: 'number',
                                    max: 22,
                                    min: 0,
                                    step: 1,
                                    value: config.centroid.zoom
                                }
                            }).querySelector('input')



                            const bboxSection = customCreateElement({
                                parent: body,
                                className: 'd-flex gap-2 flex-column',
                            })

                            const bboxHeader = customCreateElement({
                                parent: bboxSection,
                                className: 'd-flex flex-no-wrap gap-5 justify-content-between',
                            })

                            const bboxTitle = customCreateElement({
                                parent: bboxHeader,
                                className: 'fw-bold text-wrap',
                                innerText: 'Bounding Box'
                            })

                            const bboxOptions = customCreateElement({
                                parent: bboxHeader,
                                className: 'd-flex flex-nowrap gap-2'
                            })

                            const defaultBbox = customCreateElement({
                                parent: bboxOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-secondary bi bi-arrow-counterclockwise',
                                events: {
                                    click: (e) => {
                                        sInput.value = defaultBookmark.bbox.s
                                        wInput.value = defaultBookmark.bbox.w
                                        eInput.value = defaultBookmark.bbox.e
                                        nInput.value = defaultBookmark.bbox.n
                                        bboxPaddingInput.value = defaultBookmark.bbox.padding
                                        bboxMaxZoomInput.value = defaultBookmark.bbox.maxZoom
                                    }
                                }
                            })

                            const currentBbox = customCreateElement({
                                parent: bboxOptions,
                                tag:'button',
                                className: 'btn-sm btn btn-success bi bi-map',
                                events: {
                                    click: (e) => {
                                        const currentView = this.getView()
                                        sInput.value = currentView.bbox.s
                                        wInput.value = currentView.bbox.w
                                        eInput.value = currentView.bbox.e
                                        nInput.value = currentView.bbox.n
                                        bboxPaddingInput.value = currentView.bbox.padding
                                        bboxMaxZoomInput.value = currentView.bbox.maxZoom

                                    }
                                }
                            })

                            const bboxFields = customCreateElement({
                                parent: bboxSection,
                                className: 'd-flex gap-2 flex-wrap',
                            })

                            const wInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'West',
                                inputAttrs: {
                                    type: 'number',
                                    max: 180,
                                    min: -180,
                                    step: 15,
                                    value: config.bbox.w
                                }
                            }).querySelector('input')

                            const sInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'South',
                                inputAttrs: {
                                    type: 'number',
                                    max: 90,
                                    min: -90,
                                    step: 15,
                                    value: config.bbox.s
                                }
                            }).querySelector('input')

                            const eInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'East',
                                inputAttrs: {
                                    type: 'number',
                                    max: 180,
                                    min: -180,
                                    step: 15,
                                    value: config.bbox.e
                                }
                            }).querySelector('input')

                            const nInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'North',
                                inputAttrs: {
                                    type: 'number',
                                    max: 90,
                                    min: -90,
                                    step: 15,
                                    value: config.bbox.n
                                }
                            }).querySelector('input')

                            const bboxPaddingInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'Padding',
                                inputAttrs: {
                                    type: 'number',
                                    min: 0,
                                    step: 10,
                                    value: config.bbox.padding
                                }
                            }).querySelector('input')

                            const bboxMaxZoomInput = createFormControl({
                                parent: bboxFields,
                                labelInnerText: 'Maximum Zoom',
                                inputAttrs: {
                                    type: 'number',
                                    min: 0,
                                    max: 22,
                                    step: 10,
                                    value: config.bbox.maxZoom
                                }
                            }).querySelector('input')

                            const saveBtn = modal.querySelector(`.modal-footer > button[data-bs-dismiss='modal']`)
                            saveBtn.removeAttribute('data-bs-dismiss')
                            saveBtn.innerText = 'Update bookmark'
                            saveBtn.addEventListener('click', () => {
                                const precision = this.settings.precision

                                config.method = methodSelect.value
                                config.pitch = Math.round(parseFloat(pitchInput.value) * 100) / 100
                                config.bearing = Math.round(parseFloat(bearingInput.value) * 100) / 100

                                config.centroid.zoom = Math.round(parseFloat(zoomInput.value) * 100) / 100
                                config.centroid.lng = Math.round(parseFloat(centerLngInput.value) * precision) / precision
                                config.centroid.lat = Math.round(parseFloat(centerLatInput.value) * precision) / precision

                                config.bbox.w = Math.round(parseFloat(wInput.value) * precision) / precision
                                config.bbox.s = Math.round(parseFloat(sInput.value) * precision) / precision
                                config.bbox.e = Math.max(Math.round(parseFloat(eInput.value) * precision) / precision, config.bbox.w)
                                config.bbox.n = Math.max(Math.round(parseFloat(nInput.value) * precision) / precision, config.bbox.s)
                                config.bbox.padding = parseInt(bboxPaddingInput.value)
                                config.bbox.maxZoom = Math.round(parseFloat(bboxMaxZoomInput.value) * 100) / 100
                                
                                this.updateSettings()
                            })
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
                    },
                    lock: {
                        title: 'Lock map view',
                        icon: '🔒',
                        checked: this.settings.locked,
                        handler: (e) => {
                            this.settings.locked = e.target.checked
                            
                            this.settings.locked ? this.lockMapView() : this.unlockMapView()

                            this.updateSettings()
                        }
                    },
                    clear: {
                        title: 'Clear stored data',
                        icon: '🗑️',
                        attrs: {
                            'data-bs-toggle': 'modal',
                            'data-bs-target': '#clearStoredDataModal',
                        },
                        handler: (e) => {
                            e.target.checked = false
                        }
                    }
                }
            }
        }

        Object.entries(settings).forEach(([section, params]) => {
            const container = customCreateElement({
                parent: sections,
                className: 'd-flex flex-column gap-1 px-2 accordion-item border-0'
            })

            const body = customCreateElement({
                className: `collapse accordion-collapse ${Object.keys(settings)[0] === section ? 'show' : ''}`,
                attrs: {
                    'data-bs-parent': `#${sections.id}`
                }
            })

            const header = customCreateElement({
                parent: container,
                innerText: params.title,
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
                        name: type === 'radio' ? section : Array(section, name).join('-'),
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
                        innerHTML: option.icon,
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

    lockMapView() {
        const map = this.map

        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        map.dragPan.disable();
        map.keyboard.disable();
        map.touchZoomRotate.disable();

        map.getContainer().querySelector(`.maplibregl-ctrl-top-left`).classList.add('d-none')
    }
    
    unlockMapView() {
        const map = this.map
        
        map.scrollZoom.enable();
        map.doubleClickZoom.enable();
        map.dragPan.enable();
        map.keyboard.enable();
        map.touchZoomRotate.enable();

        map.getContainer().querySelector(`.maplibregl-ctrl-top-left`).classList.remove('d-none')
    }

    goToBookmark() {
        if (this.settings.locked) return

        const config = this.settings.bookmark

        if (config.method === 'centroid') {
            this.map.setZoom(config.centroid.zoom)
            this.map.setCenter(Array('lng','lat').map(i => config.centroid[i]))
        } else {
            const bboxConfig = config[config.method]

            const bbox = (
                config.method === 'bbox' 
                ? Array('w','s','e','n').map(i => bboxConfig[i]) 
                : null
            )
            
            if (bbox) {
                this.map.fitBounds(bbox, {
                    padding: bboxConfig.padding,
                    maxZoom: bboxConfig.maxZoom,
                    duration: 0
                })
            } 
        }

        this.map.setPitch(config.pitch)
        this.map.setBearing(config.bearing)
    }

    getView() {
        const bounds = this.map.getBounds().toArray().flatMap(i => i)
        const precision = this.settings.precision

        return {
            pitch: Math.round(this.map.getPitch() * 100) / 100,
            bearing: Math.round(this.map.getBearing() * 100) / 100,

            centroid: {
                zoom: Math.round(this.map.getZoom() * 100) / 100,
                ...(Object.fromEntries(
                    Object.entries(this.map.getCenter())
                    .map(([k,v]) => [k, Math.round(v * precision) / precision])
                ))
            },

            bbox: {
                w: bounds[0],
                s: bounds[1],
                e: bounds[2],
                n: bounds[3],
                padding: 0,
                maxZoom: 22,
            }
        }
    }

    configBasemapLayer() {
        const map = this.map

        if (map.getLayer('basemap')) {
            map.removeLayer('basemap')
        }

        const style = structuredClone(map.getStyle())
        
        if (!this.settings.basemap.render) {
            delete style.sky
            map.setStyle(style)
            return
        }

        const basemapTheme = this.settings.basemap.paints[(
            this.settings.basemap.theme === 'light' || (
                this.settings.basemap.theme === 'auto' 
                && getPreferredTheme() !== 'dark'
            ) ? 'light' : 'dark'
        )]

        style.sky = basemapTheme.sky
        map.setStyle(style)

        map.addLayer({
            id: 'basemap',
            type: 'raster',
            source: 'basemap',
            paint: basemapTheme.basemap
        }, map.sourcesHandler.getBeforeId('basemap'))
    }

    configBasemap() {
        const map = this.map
        const config = this.settings.basemap
        const id = 'basemap'

        if (map.getLayer(id)) {
            map.removeLayer(id)
        }

        if (map.getSource(id)) {
            map.removeSource(id)
        }

        const style = structuredClone(map.getStyle())
        if (style.sky) {
            delete style.sky
            map.setStyle(style)
        }

        if (!config.render) return

        map.addSource(id, {
            type: 'raster',
            tileSize: config.tileSize,
            maxzoom: config.maxzoom,
            tiles: config.tiles,
            attribution: config.attribution,
        })

        this.configBasemapLayer()
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