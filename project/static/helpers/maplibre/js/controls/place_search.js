class PlaceSearchControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
    }

    onAdd(map) {
        this.map = map
        this.container = customCreateElement({className:'maplibregl-ctrl maplibregl-ctrl-group d-flex flex-nowrap gap-1 align-items-center'})

        const icon = customCreateElement({
            tag:'button',
            parent: this.container,
            className: 'fs-16',
            attrs: {
                type: 'button',
                tabindex: '-1',
            },
            innerText: '🔍',
            events: {
                click: (e) => {
                    this.container.classList.add('p-1')
                    collapse.classList.remove('d-none')
                    input.focus()
                }
            }
        })

        const collapse = customCreateElement({
            parent: this.container,
            className: 'd-flex flex-no-wrap gap-1 align-items-center d-none'
        })

        const handler = async (e) => {
            const sourceId = 'placeSearch'

            const SettingsControl = this.map._settingsControl
            SettingsControl.resetGeoJSONSource(sourceId)
            
            const q = input.value.trim()
            if (q === '') return
            
            let data = turf.featureCollection([])

            const coords = isLngLatString(q)
            if (coords) {
                map.flyTo({
                    center: coords,
                    zoom: 11,
                })
                data = turf.featureCollection([turf.point(coords)])
            } else {
                data = await fetchSearchNominatim({q})
                if (data?.features?.length) {
                    const bbox = (
                        data.features.length === 1 
                        ? data.features[0].bbox ?? turf.bbox(data.features[0]) 
                        : data.bbox ?? turf.bbox(data)
                    )
                    map.fitBounds(bbox, {padding:100, maxZoom:11})
                }
            }

            if (data?.features?.length) {
                await SettingsControl.setGeoJSONData(sourceId, {
                    data, 
                    metadata: {params: {title: 'Place search result'}}
                })

                const color = `hsla(70, 100%, 50%, 1.00)`
                SettingsControl.addGeoJSONLayers(sourceId, {
                    name: 'default',
                    groups:  {
                        default: SettingsControl.getLayerParams({
                            color,
                            customParams: {
                                'fill' : {
                                    'polygons': {
                                        render: true,
                                        params: {
                                            paint: {
                                                "fill-color": manageHSLAColor(color).toString({a:0})
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
                })
            }
        }

        const input = customCreateElement({
            tag: 'input',
            parent: collapse,
            className: `form-control form-control-sm box-shadow-none border-0 p-0 fs-12 text-bg-${getPreferredTheme()}`,
            attrs: {
                type: 'search',
                tabindex: '-1',
            },
            events: {
                change: handler,
                keydown: (e) => {
                    if (e.key !== 'Enter') return
                    handler(e)
                },
            }
        })

        const close = customCreateElement({
            tag:'button',
            parent: collapse,
            className: 'bi bi-backspace-fill text-secondary',
            attrs: {
                type: 'button',
                tabindex: '-1',
            },
            events: {
                click: (e) => {
                    this.container.classList.remove('p-1')
                    collapse.classList.add('d-none')
                }
            }
        })

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}