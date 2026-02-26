class PlaceSearchControl {
    constructor(options = {}) {
        this.options = options
        this._container = null
        this.config = {
            sourceId: 'placeSearch'
        }
    }

    async runPlaceSearch(e) {
        const map = this.map
        
        const sourceId = this.config.sourceId
        map.sourcesHandler.removeSourceLayers(sourceId)
        map.interactionsHandler.clearConfigs()

        const q = this.input.value.trim()
        if (q === '') return
        
        let data = turf.featureCollection([])

        const coords = isLngLatString(q)
        if (coords) {
            map.flyTo({
                center: coords,
                zoom: Math.max(11, map.getZoom()),
            })
            data = turf.featureCollection([turf.point(coords)])
        } else {
            data = await fetchSearchNominatim({q}, {
                abortEvents: [[this.input, ['input', 'change', 'keydown:enter']]],
            })
            const features = data?.features
            if (features?.length) {
                let bbox = data.bbox
                if (!bbox) {
                    if (features.length === 1) {
                        const feature = features[0]
                        bbox = feature.bbox ?? turf.bbox(feature)
                    } else {
                        if (features.find(f => f.bbox)) {
                            bbox = turf.bbox(turf.featureCollection(features.map(f => turf.bboxPolygon(f.bbox))))
                        } else {
                            bbox = turf.bbox(data)
                        }
                    }
                }
                map.fitBounds(bbox, {padding:100, maxZoom:Math.max(11, this.map.getZoom())})
            }
        }

        if (data?.features?.length) {
            map.sourcesHandler.getGeoJSONSource(sourceId)?.setData(data)

            map.sourcesHandler.addGeoJSONLayers(sourceId, {
                properties: {
                    metadata: {
                        name: 'default',
                        params: {
                            style: 'default',
                            styles: {
                                default: {
                                    default: map.sourcesHandler.getVectorLayerParams({
                                        color: `hsl(0, 100%, 50%)`
                                    }),
                                }
                            }
                        }
                    }
                }
            })
        }
    }

    onAdd(map) {
        this.map = map
        this._container = customCreateElement({
            className:'maplibregl-ctrl maplibregl-ctrl-group d-flex flex-nowrap gap-1 align-items-center'
        })

        const icon = customCreateElement({
            tag:'button',
            parent: this._container,
            className: 'fs-16',
            attrs: {
                type: 'button',
                tabindex: '-1',
            },
            innerText: '🔍',
            events: {
                click: (e) => {
                    this._container.classList.add('p-1')
                    collapse.classList.remove('d-none')
                    input.focus()
                }
            }
        })

        const collapse = customCreateElement({
            parent: this._container,
            className: 'd-flex flex-no-wrap gap-1 align-items-center d-none'
        })

        let timeout
        const handler = (e) => {
            clearTimeout(timeout)
            timeout = setTimeout(async () => {
                await this.runPlaceSearch(e)
            }, 100)
        }

        const input = this.input = customCreateElement({
            tag: 'input',
            parent: collapse,
            className: `form-control form-control-sm box-shadow-none border-0 p-0 fs-12 text-bg-${getPreferredTheme()}`,
            attrs: {
                type: 'search',
                tabindex: '-1',
            },
            events: {
                change: (e) => {
                    handler(e)
                },
                keydown: (e) => {
                    if (e.key !== 'Enter') return
                    const event = new Event('keydown:enter')
                    input.dispatchEvent(event)
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
                    this._container.classList.remove('p-1')
                    collapse.classList.add('d-none')
                }
            }
        })

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}