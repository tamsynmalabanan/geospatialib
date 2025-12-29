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

    handleImportedMap(layers) {
        const container = document.querySelector(`#addLayersForm-results-map`)
        container.innerHTML = ''
    
        if (!Object.keys(layers).length) return

        const selectAllDiv = customCreateElement({
            parent: container,
            className: `d-flex gap-2 align-items-center sticky-top text-bg-${getPreferredTheme()}`
        })

        const selectAllCheckbox = customCreateElement({
            parent: selectAllDiv,
            tag: 'input',
            className: 'form-check-input mt-0 fs-12',
            attrs: {
                type: 'checkbox',
                value: 'all',
                checked: true,
            },
        })

        const selectAllLabel = customCreateElement({
            parent: selectAllDiv,
            tag: 'input',
            className: 'form-control border-0 box-shadow-none fs-12',
            attrs: {
                readonly: true,
                value: `Select all layers (${Object.keys(layers).length})`
            },
        })

        const layersContainer = customCreateElement({
            parent: container,
            className: 'd-flex flex-column gap-2',
        })

        Object.keys(layers).reverse().forEach(i => {
            const data = layers[i]
            console.log(data)

            const layerContainer = customCreateElement({
                parent: layersContainer,
                className: 'd-flex align-items-center'
            })

            const checkbox = customCreateElement({
                parent: layerContainer,
                tag: 'input',
                className: 'form-check-input mt-0 fs-12',
                attrs: {
                    type: 'checkbox',
                    value: i,
                    checked: true,
                }
            })

            const titleField = createFormFloating({
                parent: layerContainer,
                containerClass: 'flex-grow-1 ms-2 w-50',
                fieldClass: 'fs-12',
                fieldAttrs: {
                    type: 'text',
                    name: 'title',
                    title: data.params.name,
                    value: data.params.title,
                },
                labelText: 'Title',
                events: {
                    change: (e) => {
                        const value = e.target.value.trim()
                        if (value === '') return
                        layers[i].params.title = value
                    }
                }
            })
        })
    }

    handleAddLayersForm() {
        const form = this.map._container.querySelector(`#addLayersForm`)
        if (!form) return

        const sourceRadios = Array.from(form.elements.source)
        const mapInput = form.elements.map
        const filesInput = form.elements.files
        
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
            addBtn.disabled = Array.from(
                getActiveResultsContainer().querySelectorAll('.form-check-input')
            ).find(i => i.checked) ? false : true
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

        const resetFormatField = () => {
            const formatField = form.elements.format
            formatField.value = ''
            formatField.disabled = true
            formatField.classList.remove('is-invalid')
        }

        const resetUrlField = () => {
            const urlField = form.elements.url
            urlField.value = ''
            urlField.classList.remove('is-invalid')
            resetFormatField()
        }

        // reset form
        resetBtn.addEventListener('click', (e) => {
            sourceRadios.forEach(el => {
                const fields = form.querySelector(`#addLayersForm-fields-${el.value}`)
                Array.from(fields.querySelectorAll(`[name]`)).forEach(el => {
                    el.value = ''
                    el.classList.remove('is-invalid')
                    if (el.getAttribute('name') === 'format') el.disabled = true
                })

                const results = form.querySelector(`#addLayersForm-results-${el.value}`)
                results.innerHTML = ''
            })
            toggleAddBtn()
        })

        // layer checkbox click
        form.addEventListener('click', (e) => {
            const resultsContainer = getActiveResultsContainer()
            const checkboxSelector = `#${resultsContainer.id} .form-check-input[type="checkbox"]`
            if (!e.target.matches(checkboxSelector)) return
            
            const [selectAllCheckbox, ...layerCheckboxes] = Array.from(
                resultsContainer.querySelectorAll(checkboxSelector)
            )

            if (e.target === selectAllCheckbox) {
                layerCheckboxes.forEach(i => i.checked = e.target.checked)
            } else {
                selectAllCheckbox.checked = layerCheckboxes.every(i => i.checked)
            }
            
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

        form.addEventListener('htmx:configRequest', (e) => {
            if (e.target.matches(`#${form.querySelector(`#addLayersForm-fields-url`).id} [name]`)) {
                form.querySelector(`#addLayersForm-results-url`).innerHTML = ''
                toggleAddBtn()
                e.target.classList.remove('is-invalid')

                const urlField = form.elements.url
                const formatField = form.elements.format

                try {
                    urlField.value = (new URL(urlField.value)).href
                    
                    if (e.target === urlField) {
                        resetFormatField()
                    }
                    
                    if (e.target === formatField) {
                        e.detail.parameters['url'] = urlField.value
                    }
                } catch {
                    e.preventDefault()

                    if (urlField.value === '') {
                        resetUrlField()
                    } else {
                        urlField.parentElement.querySelector('.invalid-feedback ul').innerText = 'Please enter a valid URL.'
                        urlField.classList.add('is-invalid')
                        resetFormatField()
                    }
                }
            }
        })
        
        form.addEventListener('htmx:afterSwap', (e) => {
            toggleAddBtn()
        })
    
        form.addEventListener('htmx:responseError', (e) => {
            if (e.detail.pathInfo.requestPath !== '/htmx/collection/validate/') return

            e.target.classList.add('is-invalid')
            
            if (e.target.name === 'url') {
                e.target.nextElementSibling.querySelector('ul').innerText = 'Unable to inspect URL content.'
                resetFormatField()
            }
            
            if (e.target.name === 'format') {
                e.target.nextElementSibling.querySelector('ul').innerText = 'Unable to retrieve layers.'
                resetUrlField()
            }
        })

        filesInput.addEventListener('change', async (e) => {
            filesInput.classList.remove('is-invalid')
            form.querySelector(`#addLayersForm-results-files`).innerHTML = ''
            toggleAddBtn()
                                                                                                                                                                                                            
            const fileList = Array.from(filesInput.files)
            if (!fileList.length) return
        
            try {
                const filesArray = await getValidLayersArray(fileList)
                if (!filesArray?.length) {
                    throw new Error('No valid layers found.')
                }

                const layerNames = filesArray.map(i => i.name)
                filesInput.setAttribute('hx-vals', JSON.stringify({layerNames: JSON.stringify(layerNames)}))
                filesInput.dispatchEvent(new Event("get-layer-forms", { bubbles: true }))
            } catch (err) {
                filesInput.parentElement.querySelector(`.invalid-feedback ul`).innerText = err.message
                filesInput.classList.add('is-invalid')
            }
        })

        mapInput.addEventListener('change', async (e) => {
            form.querySelector(`#addLayersForm-results-map`).innerHTML = ''
            mapInput.classList.remove('is-invalid')
            toggleAddBtn()

            if (!mapInput.files.length) return
            
            try {
                const rawData = await getFileRawData(mapInput.files[0])
                const layers = compressJSON.decompress(JSON.parse(rawData))
                if (!Object.keys(layers).length) {
                    throw new Error('No layers found.')
                }

                this.handleImportedMap(layers)
                toggleAddBtn()
            } catch (err) {
                mapInput.parentElement.querySelector(`.invalid-feedback ul`).innerText = err.message
                mapInput.classList.add('is-invalid')
            }
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
