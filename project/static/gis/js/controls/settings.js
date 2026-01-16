class SettingsControl {
    constructor(options={}) {
        this.config = {
            projection: 'mercator',
            settings: {
                protections: {
                    title: 'Projection options',
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
                    title: 'Popup options',
                    handler: (e) => {
                        const section = e.target.parentElement
                        const interactionsHandler = this.map.interactionsHandler
                        const config = interactionsHandler.config.interactions.info

                        const toggle = section.querySelector('input[name="popup-toggle"]')
                        const osm = section.querySelector('input[name="popup-osm"]')
                        const layers = section.querySelector('input[name="popup-layers"]')

                        config.active = toggle.checked
                        osm.disabled = !toggle.checked
                        layers.disabled = !toggle.checked

                        config.targets.osm = osm.checked
                        config.targets.layers = layers.checked

                        interactionsHandler.configCursor()
                    },
                    options: {
                        toggle: {
                            label: 'Toggle popup',
                            icon: '💬',
                            checked: true,
                        },
                        layers: {
                            label: 'Layers',
                            icon: '📚',
                            checked: true,
                        },
                        osm: {
                            label: 'Openstreetmap',
                            icon: '🗾',
                            checked: true,
                        },
                    }
                }
            }
        }
    }

    configSettings() {
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

        Object.entries(this.config.settings).forEach(([section, params]) => {
            const container = customCreateElement({
                parent: menu,
                className: 'd-flex flex-column gap-2 px-2'
            })

            const body = customCreateElement({
                className: 'collapse show',
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
                className: 'd-flex flex-wrap gap-2'
            })

            Object.entries(params.options).forEach(([name, option]) => {
                const input = customCreateElement({
                    tag: 'input',
                    parent: options,
                    attrs: {
                        type: params.radio ? 'radio' : 'checkbox',
                        name: params.radio ? section : Array(section, name).join('-'),
                        ...(option.checked ? {checked: true} : {})
                    },
                    className: 'btn-check',
                    events: {
                        click: (e) => {
                            params.handler?.(e, {section, params, name, option})
                            option.handler?.(e, {section, params, name, option})
                        }
                    }
                })
                
                const label = customCreateElement({
                    tag: 'label',
                    parent: options,
                    className: `btn btn-sm btn-${getPreferredTheme()}`,
                    attrs: {
                        title: option.title,
                        for: input.id,
                    },
                    innerText: option.icon,
                })
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