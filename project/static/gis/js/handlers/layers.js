class LayersHandler {
    constructor() {
        const modal = this.modal = document.querySelector(`#addLayersModal`)

        this.fieldContainers = Object.fromEntries(
            Array.from(modal.querySelector('#addLayersFields').firstElementChild.children)
            .map(el => [el.id.split('-').pop(), el])
        )

        this.resultsContainers = Object.fromEntries(
            Array.from(modal.querySelector('#addLayersResults').children)
            .map(el => [el.id.split('-').pop(), el])
        )

        const form = this.form = this.modal.querySelector('form')
        form.elements.resetParams.addEventListener('click', (e) => {
            this.resetURLParams()
        })
        form.elements.getLayers.addEventListener('click', (e) => {
            this.updateURLResults()
        })

        this.handleSourceRadio()
        this.handleCollapseToggles()
        this.handleURLParamsBtns()
        this.handleURLSource()
        this.handleFilesSource()
        this.handleReserBtn()
    }

    getResultsContent(layers) {
        const container = customCreateElement({
            className: 'd-flex flex-column gap-2'
        })

        layers.forEach(layer => {
            const card = customCreateElement({
                parent: container,
                className: 'd-flex flex-nowrap flex-grow-1 gap-3 border rounded p-2',
            })
        
            const img = customCreateElement({
                tag: 'img',
                parent: card,
                className: 'rounded',
                attrs: {
                    src: layer.thumbnail,
                    alt: 'Image not found.',
                    height: 100, 
                }
            })

            const body = customCreateElement({
                parent:card,
                className: 'd-flex flex-wrap gap-3 flex-grow-1'
            })

            const info = customCreateElement({
                parent: body,
                className: 'd-flex flex-column flex-grow-1'
            })

            if(layer.title) {
                const title = customCreateElement({
                    tag: 'span',
                    parent: info,
                    className: 'lead fs-14 fw-medium text-wrap text-break',
                    innerText: layer.title,
                })
            }

            if (layer.name !== layer.title) {
                const name = customCreateElement({
                    tag: 'span',
                    parent: info,
                    className: 'lead fs-14 text-wrap text-break',
                    innerText: layer.name,
                })
            }

            const footer = customCreateElement({
                parent: body,
            })

            const addBtn = customCreateElement({
                tag: 'button',
                parent: footer,
                className: 'btn btn-sm btn-success bi bi-plus-lg fs-12',
                attrs: {
                    type: 'button',
                },
                events: {
                    click: (e) => {
                        const event = new CustomEvent("addLayer", {detail: {layer}})
                        this.modal._mapContainer.dispatchEvent(event)
                    }
                }
            })

        })

        return container
    }

    resetURLParams() {
        Array('get', 'header').forEach(i => {
            this.form.querySelector(`#addLayersURLParams-${i}Params`).innerHTML = ''
        })
    }
    
    handleCollapseToggles() {
        Array('shown', 'hidden').forEach(i => {
            Array('collapseParams', 'collapseFields').map(name => {
                return this.modal.querySelector(
                    this.form.elements[name].getAttribute('data-bs-target')
                )
            }).forEach(el => {
                el.addEventListener(`${i}.bs.collapse`, (e) => {    
                    const shown = el.classList.contains('show')
                    const toggle = this.modal.querySelector(`[data-bs-target="#${el.id}"]`)
                    toggle.classList.toggle('bi-caret-up-fill', shown)
                    toggle.classList.toggle('bi-caret-down-fill', !shown)
                })
            })
        })
    }

    createURLFetchParamsFields(key, {
        keyName='', 
        valueString='',
    }={}) {
        const name = `${key}Params`

        const container = customCreateElement({
            parent: this.form.querySelector(`#addLayersURLParams-${name}`),
            className: 'd-flex gap-2 align-items-end'
        })

        const badge = customCreateElement({
            parent: container,
            tag: 'span',
            className: 'badge px-1 mb-1 text-bg-secondary rounded-1 fs-12 font-monospace',
            innerText: key.toUpperCase(),
            style: {
                minWidth: '50px' 
            }
        })

        const keyField = createFormControl({
            parent: container,
            fs: 'fs-12',
            inputAttrs: {
                placeholder: `Key`,
                value: keyName,
            }
        }).querySelector('input')
        
        const valueField = createFormControl({
            parent: container,
            fs: 'fs-12',
            inputAttrs: {
                placeholder: 'Value',
                value: valueString,
            }

        }).querySelector('input')

        const optionsContainer = customCreateElement({
            parent: container,
        })

        const removeBtn = customCreateElement({
            parent: optionsContainer,
            tag: 'button',
            className: 'bi bi-x fs-12 border-0 bg-transparent p-0 pb-1',
            attrs: {
                tabindex: "-1"
            },
            events: {
                click: (e) => {
                    if (keyField.value || valueField.value) {
                        this.resultsContainers.url.innerHTML = ''
                    } 

                    container.remove()
                }
            }
        })
    }

    handleURLParamsBtns() {
        Array('get', 'header').forEach(key => {
            const name = `${key}Params`
            const el = this.form.elements[name]
            el.addEventListener('click', (e) => {
                this.createURLFetchParamsFields(key)
            })
        })
    }

    handleSourceRadio() {
        const sourceRadio = Array.from(this.form.elements.source)
        sourceRadio.forEach(source => {
            source.addEventListener('click', (e) => {
                Array(
                    ...Object.values(this.fieldContainers), 
                    ...Object.values(this.resultsContainers)
                ).forEach(container => {
                    container.classList.toggle('d-none', !container.id.endsWith(source.value))
                })
            })
        })
    }

    isTilesUrl(url) {
        const pattern = /(?:\{[^}]+\}|%7B[^%]+%7D)/
        return pattern.test(url)
    }

    getFormatOptions() {
        const options = Object.fromEntries(
        Array.from(this.form.elements.format.querySelectorAll('option'))
            .map(el => [el.value, [el.innerText]])
        )

        options.wms = [
            ...options.wms,
            'mapserv',
            'geoserver',
            '1.1.1',
            '1.3.0',
            'webmapservice',
        ]

        options.wfs = [
            ...options.wfs,
            'mapserv',
            'mapserv',
            'geoserver',
            'webfeatureservice',
        ]

        return options
    }

    guessFormatFromURL(url) {
        if (this.isTilesUrl(url)) {
            return 'xyz'
        }


        return getBestMatch(url, this.getFormatOptions())
    }

    getXYZTilesLayerName(url) {
        const parsedURL = new URL(url)
        const host = decodeURIComponent(parsedURL.host).split('.').slice(0,-1).reverse().join(' ')
        const pathname = decodeURIComponent(parsedURL.pathname).split('/').filter(i => {
            return i && !i.includes('{') && !host.toLowerCase().includes(i.toLowerCase())
        })

        return slugify(toTitleCase(Array(host, pathname).flatMap(i => i).join(' ')))
    }

    getXYZTilesThumbnailURL(url, {fetchParams}={}) {
        url = decodeURIComponent(pushURLParams(url, fetchParams.get))

        Array('x', 'y', 'z').forEach(i => {
            url = url.replace(`{${i}}`, '0')
        })

        return url
    }

    normalizeXYZTilesURL(url) {
        url = decodeURIComponent(url)

        if (Array("z", "x", "y").every(i => url.includes(`{${i}}`))) return url

        const parts = url.split("{", 4)
        let [href, z, x, y] = parts

        const zParts = z.split("}", 2)
        if (zParts[0] !== "z") {
            z = Array("z", zParts[1]).join("}")
        }

        const xParts = x.split("}", 2)
        if (xParts[0] !== "x") {
            x = Array("x", xParts[1]).join("}")
        }

        const yParts = y.split("}", 2)
        if (yParts[0] !== "y") {
            y = Array("y", yParts[1]).join("}")
        }

        return Array(href, z, x, y).join("{")
    }

    getLayersFromURL(url, format, {
        fetchParams,
    }={}) {
        if (format === 'xyz') {
            return [{
                url, 
                format, 
                ...fetchParams,
                name: this.getXYZTilesLayerName(url),
                thumbnail: this.getXYZTilesThumbnailURL(url, {fetchParams}),
            }]
        }
        
        if (Array('wms').includes(format)) {

        }

        return []
    }

    normalizeURLBasedOnFormat(url, format) {
        const parsed = new URL(url)
        
        url = parsed.origin + parsed.pathname
        const params = Object.fromEntries(parsed.searchParams.entries())

        if (format === 'xyz') {
            url = this.normalizeXYZTilesURL(url)
        }

        return [url, params]
    }


    handleURLSource() {
        const urlField = this.form.elements.url
        const formatField = this.form.elements.format

        const collapseParamsBtn = this.form.elements.collapseParams
        const paramsCollapse = this.modal.querySelector(
            collapseParamsBtn.getAttribute('data-bs-target')
        ).parentElement

        this.fieldContainers.url.addEventListener('change', (e) => {
            Array(urlField, formatField).forEach(el => {
                el.classList.remove('is-invalid')
            })
            paramsCollapse.classList.add('d-none')
            this.resultsContainers.url.innerHTML = ''
            this.resetURLParams()
            
            let url = validateURL(urlField.value)
            let format = formatField.value
            let params

            if (url) {
                urlField.value = url
                formatField.disabled = false
                
                if (e.target === urlField || format === '') {
                    format = formatField.value = this.guessFormatFromURL(url)
                }

                if (format === '') {
                    formatField.classList.add('is-invalid')
                    formatField.parentElement.querySelector(`.invalid-feedback ul`)
                    .innerHTML = `<li>Please select the correct format.</li>`
                } else {
                    [url, params] = [urlField.value, _] = this.normalizeURLBasedOnFormat(url, format)
                    
                    Object.entries(params).forEach(([keyName, valueString]) => {
                        this.createURLFetchParamsFields('get', {keyName, valueString})
                    })

                    paramsCollapse.classList.remove('d-none')
                }
            } else {
                formatField.value = ''
                formatField.disabled = true
                
                if (urlField.value.trim() !== '') {
                    urlField.classList.add('is-invalid')
                    urlField.parentElement.querySelector(`.invalid-feedback ul`)
                    .innerHTML = `<li>Please enter a valid URL.</li>`
                }
            }
        })
    }

    handleReserBtn() {
        this.form.elements.reset.addEventListener('click', (e) => {
            Array('url', 'files').forEach(name => {
                const el = this.form.elements[name]
                el.value = ''
                
                const event = new Event('change', { bubbles: true })
                el.dispatchEvent(event)
            })
        })
    }

    handleFilesSource() {
        const filesField = this.form.elements.files

        this.fieldContainers.files.addEventListener('change', (e) => {
            filesField.classList.remove('is-invalid')
            this.resultsContainers.files.innerHTML = ''
        })
    }

    getURLFetchParams() {
        return Object.fromEntries(Array('get', 'header').map(key => {
            return [key, Object.fromEntries(Array.from(this.form.querySelector(`#addLayersURLParams-${key}Params`).children).map(el => {
                const key = el.querySelector(`input[placeholder="Key"]`).value.trim()
                const value = el.querySelector(`input[placeholder="Value"]`).value
                if (Array(key, value).some(i => !i || i === '')) return
                return [key, value]
            }).filter(Boolean))]
        }))
    }

    updateURLResults() {
        this.resultsContainers.url.innerHTML = ''

        const formatField = this.form.elements.format

        const url = this.form.elements.url.value
        const format = formatField.value

        const fetchParams = this.getURLFetchParams()
        const layers = this.getLayersFromURL(url, format, {fetchParams})
        if (layers.length) {
            this.resultsContainers.url.appendChild(this.getResultsContent(layers))
        } else {
            formatField.classList.add('is-invalid')
            formatField.parentElement.querySelector(`.invalid-feedback ul`)
            .innerHTML = `<li>No layers retrieved in this format.</li>`
        }
    }
}