class UserControl {
    constructor(options = {}) {
        this.options = options
        this.container = null
        this.searchResultsBoundsToggle = null
        this.searchResultsThumbnailsToggle = null
        this.toggleSearchResultsBoundsTimeout = null
        this.toggleSearchResultsThumbnailsTimeout = null
    }

    toggleSearchResultsBounds() {
        clearTimeout(this.toggleSearchResultsBoundsTimeout)
        this.toggleSearchResultsBoundsTimeout = setTimeout(async () => {
            const sourceId = 'searchResultBounds'
            const settings = this.map._settingsControl
            const searchResults = this.map._container.querySelector(`#searchResults`)

            let data
            if (this.searchResultsBoundsToggle?.checked) {
                const features = Array.from(searchResults.querySelectorAll(`[data-map-layer-source]`)).map(el => {
                    const layerSource = el.getAttribute('data-map-layer-source') ?? '{}'
                    let properties = JSON.parse(layerSource)
                    if (!properties.bbox) return

                    const menu = customCreateElement({
                        className: 'd-flex gap-2'
                    })

                    const addBtn = customCreateElement({
                        tag: 'button',
                        parent: menu,
                        className: `btn btn-sm bg-transparent border w-auto h-auto fs-10`,
                        innerText: 'Add layers',
                        attrs: {
                            'data-map-layer-source': layerSource
                        }
                    })

                    properties = {
                        menu: menu.outerHTML,
                        ...properties,
                    }
                    return turf.bboxPolygon(properties.bbox, {properties})
                }).filter(i => i)
                
                if (features.length) {
                    data = turf.featureCollection(features)
                }
            }
            
            if (data?.features?.length) {
                await settings.setGeoJSONData(sourceId, {
                    data, 
                    metadata: {params: {title: 'Search result bounds'}}
                })

                const groups = Object.fromEntries(Array.from(new Set(data.features.map(f => f.properties.type))).map(i => {
                    const color = rgbToHSLA(searchResults.querySelector(`[title="${i}"]`).style.backgroundColor)
                    const params = settings.getLayerParams({
                        filter: ["==", "type", i],
                        color,
                        customParams: {
                            'fill' : {
                                'polygons': {
                                    render: false,
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
                                            'line-width': 3,
                                            'line-opacity': 0.5,
                                        },
                                    }
                                }
                            },
                        }
                    })
                    return [i, params]
                }))

                settings.addGeoJSONLayers(sourceId, {name: 'default', groups})
            } else {
                settings.resetGeoJSONSource(sourceId)
            }
        }, 200)
    }

    handleSearchResultsBoundsToggle() {
        const mapContainer = this.map._container
        mapContainer.addEventListener('htmx:afterSwap', (e) => {
            const searchResultsBoundsToggle = mapContainer.querySelector(`#searchResultsBoundsToggle`)
            if (searchResultsBoundsToggle) {
                this.searchResultsBoundsToggle = searchResultsBoundsToggle
                this.toggleSearchResultsBounds()
                searchResultsBoundsToggle.addEventListener('click', (e) => {
                    this.toggleSearchResultsBounds()
                })
            }

            if (e.detail.pathInfo.requestPath.startsWith(`/htmx/library/search/`)) {
                this.toggleSearchResultsBounds()
            }
        })
    }

    toggleSearchResultsThumbnails() {
        clearTimeout(this.toggleSearchResultsThumbnailsTimeout)
        this.toggleSearchResultsThumbnailsTimeout = setTimeout(async () => {
            const searchResults = this.map._container.querySelector(`#searchResults`)
            const thumbnails = Array.from(searchResults.querySelectorAll(`.carousel`))

            if (this.searchResultsThumbnailsToggle?.checked) {
                thumbnails.forEach(el => {
                    el.classList.remove('d-none')
                })
            } else {
                thumbnails.forEach(el => {
                    el.classList.add('d-none')
                })
            }
        }, 200)
    }

    handleSearchResultsThumbnailsToggle() {
        const mapContainer = this.map._container
        mapContainer.addEventListener('htmx:afterSwap', (e) => {
            const searchResultsThumbnailsToggle = mapContainer.querySelector(`#searchResultsThumbnailsToggle`)
            if (searchResultsThumbnailsToggle) {
                this.searchResultsThumbnailsToggle = searchResultsThumbnailsToggle
                this.toggleSearchResultsThumbnails()
                searchResultsThumbnailsToggle.addEventListener('click', (e) => {
                    this.toggleSearchResultsThumbnails()
                })
            }

            if (e.detail.pathInfo.requestPath.startsWith(`/htmx/library/search/`)) {
                this.toggleSearchResultsThumbnails()
            }
        })
    }

    handleLayerFormsContainer() {
        const container = this.map._container.querySelector(`#layerFormsContainer`)

        container.addEventListener('shown.bs.collapse', (e) => {
            container.querySelector(`input[name='query']`).focus()
        })
    }

    handleAddLayersForm() {
        const form = this.map._container.querySelector(`#addLayersForm`)
        if (!form) return

        const sourceRadios = Array.from(form.elements.source)
        const mapInput = form.elements.map
        const filesInput = form.elements.files
        
        const getURLInput = () => form.elements.url
        const getFormatInput = () => form.elements.format
        
        const resetBtn = form.elements.reset
        const vectorBtn = form.elements.vector
        const addBtn = form.elements.add

        const getActiveSourceRadio = () => {
            return sourceRadios.find(el => el.checked)
        }

        const getActiveResultsContainer = () => {
            return form.querySelector(`#addLayersForm-results-${getActiveSourceRadio().value}`)
        }

        const toggleAddBtn = () => {
            addBtn.disabled = Array.from(getActiveResultsContainer().querySelectorAll('.form-check-input')).find(i => i.checked) ? false : true
        }

        // switching sources
        sourceRadios.forEach(el => {
            el.parentElement.addEventListener('click', (e) => {
                sourceRadios.forEach(i => {
                    `#addLayersForm-source-${i.value}`
                    const fields = form.querySelector(`#addLayersForm-fields-${i.value}`)
                    fields.classList.toggle('d-none', el !== i)
                    
                    const results = form.querySelector(`#addLayersForm-results-${i.value}`)
                    results.classList.toggle('d-none', el !== i)

                    toggleAddBtn()
                })
            })
        })

        // reset form
        resetBtn.addEventListener('click', (e) => {
            mapInput.value = ''
            filesInput.value = ''
            getURLInput().value = ''

            const formatInput = getFormatInput()
            formatInput.value = ''
            formatInput.disabled = true

            sourceRadios.forEach(el => {
                const results = form.querySelector(`#addLayersForm-results-${el.value}`)
                results.innerHTML = ''
            })

            addBtn.disabled = true

            toggleAddBtn()
        })

        // layer checkbox click
        form.addEventListener('click', (e) => {
            if (!e.target.matches(`#${getActiveResultsContainer().id} .form-check-input`)) return
            toggleAddBtn()
        })
        
        vectorBtn.addEventListener('click', async (e) => {
            const settings = this.map._settingsControl
            const sourceId = Array('vector', generateRandomString()).join('-')

            await settings.setGeoJSONData(sourceId, {
                metadata: {params: {title: 'New Layer'}}
            })
            settings.addGeoJSONLayers(sourceId)
        })
    }
    
    onAdd(map) {
        this.map = map

        this.container = customCreateElement({
            id: `${this.map._container.id}-user-control`,
        })

        this.handleLayerFormsContainer()
        this.handleSearchResultsBoundsToggle()
        this.handleSearchResultsThumbnailsToggle()
        this.handleAddLayersForm()

        return this.container
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}
