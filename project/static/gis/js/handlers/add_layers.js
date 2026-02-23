class AddLayersHandler {
    constructor(modal) {
        this.abortControllers = {
            url: null,
            files: null,
        }

        this.modal = modal

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
        
        form.elements.getLayers.addEventListener('click', async (e) => {
            await this.updateURLResults()
        })
        
        form.addEventListener('submit', (e) => {
            e.preventDefault()
        })

        this.handleSourceRadio()
        this.handleCollapseToggles()
        this.handleURLParamsBtns()
        this.handleURLSource()
        this.handleFilesSource()
        this.handleResetBtn()
        this.handleFilterLayers()
    }

    handleFilterLayers() {
        const container = this.modal.querySelector('#addLayersFilter')
        const filterField = this.form.elements.filter

        const observer = elementMutationObserver(this.modal, (m) => {
            container.classList.toggle('d-none', this.resultsContainers[
                Array.from(this.form.elements.source)
                .find(el => el.checked).value
            ].innerHTML === '')
        }, {childList: true, subtree: true})

        filterField.addEventListener('change', (e) => {
            const value = filterField.value = filterField.value.trim().toLowerCase()
            Object.values(this.resultsContainers).forEach(el => {
                Array.from(el.firstElementChild?.children || []).forEach(child => {
                    value.split(' ').every(i => !child.innerHTML.toLowerCase().includes(i))
                    child.classList.toggle('d-none', value.split(' ').some(i => !child.innerHTML.toLowerCase().includes(i)))
                })
            })
        })
    }
    
    createLayerThumbnail(layer, container) {
        if (Array('xyz').includes(layer.format)) {
            return customCreateElement({
                parent: container,
                tag: 'img',
                attrs: {
                    src: layer.styles?.[layer.style]?.thumbnail,
                    width: 180,
                    height: 120,
                    alt: 'Image not found.'
                }
            })
        }

        if (!container?.id) return

        const leafletMap = L.map(container.id, {
            zoomControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false, 
            renderer: L.canvas(),
        })
        leafletMap._handlers.forEach(handler => handler.disable())
        leafletMap.addLayer(L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }))
        const attr = container.querySelector(`.leaflet-control-attribution.leaflet-control`)
        attr.style.backgroundColor = 'transparent'
        attr.style.fontSize = 'xx-small'
        attr.style.textAlign = 'end'

        const bbox = layer.bbox || [-180, -90, 180, 90]
        const boundsLayer = L.geoJSON(turf.bboxPolygon(bbox), {
            style: {
                color: 'red',
                weight: 0,
                fillColor: 'red',
                fillOpacity: 0.25,
            }
        })

        let leafletLayer = boundsLayer

        if (Array('wms').includes(layer.format)) {
            leafletLayer = L.tileLayer.wms(pushURLParams(layer.url, Object.fromEntries(
                Object.entries(layer.get).filter(([k,v]) => {
                    return !Array('service', 'request').includes(k.toLowerCase())
                })
            )), {
                layers: layer.name,
                format: 'image/png',
                transparent: true,
                ...(Object.keys(layer.styles).length > 1 ? {styles: layer.style} : {})
            })
        }

        if (leafletLayer) {
            leafletMap.fitBounds(boundsLayer.getBounds())
            leafletMap.addLayer(leafletLayer)
        }
    }

    getResultsContent(layers) {
        const filterField = this.form.elements.filter
        
        const container = customCreateElement({
            className: 'd-flex flex-column gap-2'
        })

        console.log(layers)

        for (const layer of layers) {

            const card = customCreateElement({
                parent: container,
                className: 'd-flex flex-nowrap flex-grow-1 gap-3 rounded p-2 d-none',
            })

            const thumbnail = customCreateElement({
                parent: card,
                style: {
                    minHeight: '120px',
                    minWidth: '180px',
                    maxHeight: '120px',
                    maxWidth: '180px',
                },
                handlers: {
                    content: (el) => {
                        elementIntersectionObserver(el, () => {
                            this.createLayerThumbnail(layer, el)
                        }, {once: true})
                    }
                }
            })
    
            const body = customCreateElement({
                parent:card,
                className: 'd-flex gap-3 gap-sm-5 flex-grow-1 flex-wrap flex-sm-nowrap'
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
    
            if (Object.keys(layer.styles).length > 1) {
                const styles = createFormSelect({
                    parent: info,
                    selected: layer.style,
                    options: Object.fromEntries(Object.entries(layer.styles).map(([name, params]) => {
                        return [name, params.title || name]
                    })),
                    fs: 'fs-12',
                    events: {
                        change: (e) => {
                            layer.style = e.target.value
                            thumbnail.innerHTML = ''
                            thumbnail._leaflet_id = null
                            this.createLayerThumbnail(layer, thumbnail)
                        }
                    }
                })
            }
    
            const footer = customCreateElement({
                parent: body,
                className: 'mt-auto mt-sm-0 ms-auto',
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
    
            card.classList.toggle('d-none', filterField.value.split(' ').some(i => !card.innerHTML.toLowerCase().includes(i)))
        }

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
                    if (keyField.value && valueField.value) {
                        const event = new Event('change', { bubbles: true })
                        this.fieldContainers.url.dispatchEvent(event)
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

    getXYZTilesThumbnailURL(url, {get}={}) {
        url = decodeURIComponent(pushURLParams(url, get))

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

    getWMSThumbnailURL(url, name, style, bbox) {
        return pushURLParams(url, {
            "service": "WMS",
            "version": "1.3.0",
            "request": "GetMap",
            "layers": name,
            "styles": style,
            "crs": "EPSG:4326",
            "bbox": '-180,-90,180,90',
            "width": "100",
            "height": "100",
            "format": "image/png",
            "transparent": "true"
        })
    }

    getWFSBbox(layer) {
        let bbox = [-180, -90, 180, 90]
        
        const geoBBox = layer.querySelector("WGS84BoundingBox")
        if (geoBBox) {
            bbox = Array(
                'LowerCorner', 
                'UpperCorner'
            ).map(i => {
                return (
                    geoBBox.querySelector(i)?.textContent
                    ?.split(' ').map(i => parseFloat(i))
                )
            }).flatMap(i => i)
        } else {
            console.log('wfs has no bbox', layer)
        }

        return normalizeBbox(bbox)
    }



    async getWMSBbox(layer) {
        let bbox = [-180, -90, 180, 90]
        
        const geoBBox = layer.querySelector("EX_GeographicBoundingBox")
        if (geoBBox) {
            bbox = Array(
                'westBoundLongitude', 
                'southBoundLatitude', 
                'eastBoundLongitude', 
                'northBoundLatitude'
            ).map(i => parseFloat(geoBBox.querySelector(i)?.textContent))
        } else {
            const bboxes = layer.querySelectorAll("BoundingBox").forEach(box => {
                return {
                    crs: box.getAttribute('CRS') || box.getAttribute('SRS'), 
                    bbox: Array('minx', 'miny', 'maxx', 'maxy').map(i => parseFloat(box.getAttribute(i)))
                }
            })
            const bboxWGS84 = bboxes?.find(i => i.crs === "EPSG:4326")
            if (bboxWGS84) {
                bbox = bboxWGS84.bbox
            } else if (bboxes.length) {
                const bboxOther = bboxes[0]
                const bboxPolygon = await transformCoordinates(
                    turf.bboxPolygon(bboxOther.bbox), 
                    parseInt(bboxOther.crs.toLowerCase().split('epsg:').pop()),
                    4326
                )
                bbox = turf.bbox(bboxPolygon)
            }
        }

        return normalizeBbox(bbox)
    }

    async getWMSLayers(url) {
        return await customFetch(pushURLParams(url, {
            service: 'WMS',
            request: 'GetCapabilities',
        }), {
            abortController: this.abortControllers.url,
            callback: async (response) => {
                const text = await response.text()
                const parser = new DOMParser()
                const xmlDoc = parser.parseFromString(text, "application/xml")
        
                const layers = []
        
                for (const layer of Array.from(xmlDoc.querySelectorAll("Layer")).slice(1)) {
                    const name = layer.querySelector("Name")?.textContent || null
                    const title = layer.querySelector("Title")?.textContent || name
                    const crs = layer.querySelector("CRS")?.textContent || null
                    const bbox = await this.getWMSBbox(layer)
                    const styles = Object.fromEntries(Array.from(layer.querySelectorAll("Style")).map(style => {
                        const styleName = style.querySelector("Name")?.textContent || null
                        if (!styleName) return
                        return [styleName, {
                            title: style.querySelector("Name")?.textContent || styleName,
                            legendURL: style.querySelector("LegendURL OnlineResource")?.getAttribute('xlink:href') || null,
                            thumbnail: this.getWMSThumbnailURL(url, name, styleName, bbox),
                        }]
                    }).filter(Boolean))
                    const style = Object.keys(styles)[0]
            
                    layers.push({
                        name,
                        title,
                        crs,
                        styles,
                        style,
                        bbox,
                    })
                }

                return layers
            }
        }).catch(error => {
            console.log(error)
            return []
        })
    }

    async getWFSLayers(url) {
        return await customFetch(pushURLParams(url, {
            service: 'WFS',
            request: 'GetCapabilities',
        }), {
            abortController: this.abortControllers.url,
            callback: async (response) => {
                const text = await response.text()
                const parser = new DOMParser()
                const xmlDoc = parser.parseFromString(text, "application/xml")
                
                const layers = []
                
                Array.from(xmlDoc.querySelectorAll("FeatureType")).forEach(layer => {
                    const name = layer.querySelector("Name")?.textContent || null
                    const title = layer.querySelector("Title")?.textContent || name
                    const crs = (() => {
                        const srid = parseInt(
                            layer.querySelector("DefaultCRS")?.textContent
                            ?.toLowerCase().replaceAll('::', ':').split('epsg:', 2).pop()
                        )
                        return !isNaN(srid) ? `EPSG:${srid}` : null
                    })()
                    const bbox = this.getWFSBbox(layer)
                    const styles = {
                        default: {}
                    }
                    const style = Object.keys(styles)[0]
            
                    layers.push({
                        name,
                        title,
                        crs,
                        styles,
                        style,
                        bbox,
                    })
                })

                return layers
            }
        }).catch(error => {
            console.log(error)
            return []
        })
    }

    async getLayersFromURL(url, format) {
        const {get, header} = this.getURLFetchParams()

        const baseLayer = {url, format, get, header}

        let layers = []

        if (format === 'xyz') {
            layers = [{
                ...baseLayer,
                name: this.getXYZTilesLayerName(url),
                style: 'default',
                styles: {
                    default: {
                        thumbnail: this.getXYZTilesThumbnailURL(url, {get}),
                    }
                }
            }]
        }
        
        if (Array('wms').includes(format)) {
            layers = await this.getWMSLayers(url)
            layers = layers.map(layer => {
                return {...baseLayer, ...layer}
            })
        }
        
        if (Array('wfs').includes(format)) {
            layers = await this.getWFSLayers(url)
            layers = layers.map(layer => {
                return {...baseLayer, ...layer}
            })
        }

        return layers
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
            this.abortControllers.url?.abort('Field changed.')

            Array(urlField, formatField).forEach(el => {
                el.classList.remove('is-invalid')
            })
            
            paramsCollapse.classList.add('d-none')
            this.resultsContainers.url.innerHTML = ''

            if (Array(urlField).includes(e.target)) {
                this.resetURLParams()
            }
            
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
                    [url, params] = [urlField.value, params] = this.normalizeURLBasedOnFormat(url, format)
                    
                    Object.entries(params).forEach(([keyName, valueString]) => {
                        this.createURLFetchParamsFields('get', {keyName, valueString})
                    })

                    this.fieldContainers.url.querySelector(`.spinner-border`).classList.add('d-none')
                    this.form.elements.getLayers.disabled = false
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

    handleResetBtn() {
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

    isValidAbortController(controller) {
        if (controller.signal.aborted) return false
        return Object.values(this.abortControllers).find(i => i === controller)
    }

    async updateURLResults() {
        const abortController = this.abortControllers.url = new AbortController()

        const getLayersBtn = this.form.elements.getLayers
        const spinner = this.fieldContainers.url.querySelector(`.spinner-border`)

        getLayersBtn.disabled = true
        spinner.classList.remove('d-none')

        this.resultsContainers.url.innerHTML = ''

        const formatField = this.form.elements.format

        const url = this.form.elements.url.value
        const format = formatField.value

        const layers = await this.getLayersFromURL(url, format)

        if(this.isValidAbortController(abortController)) {
            if (layers.length) {
                const content = this.getResultsContent(layers)
                this.resultsContainers.url.appendChild(content)
            } else {
                formatField.classList.add('is-invalid')
                formatField.parentElement.querySelector(`.invalid-feedback ul`)
                .innerHTML = `<li>Failed to retrieve layers in this format.</li>`
            }
        }

        spinner.classList.add('d-none')
        if (!formatField.classList.contains('is-invalid')) {
            getLayersBtn.disabled = false
        }
    }
}