const getSearchForm = () => document.querySelector('#searchForm')

const getSearchMap = () => (window.maps ?? []).find(map => map.getContainer().id === getSearchForm().getAttribute('data-form-map-id'))

const zoomToSearchResultBbox = () => {
    const layerParams = event.target.parentElement.dataset.layerParams
    return getSearchMap()?.fitBounds(L.geoJSON(
        turf.bboxPolygon(JSON.parse(layerParams).bbox)
    ).getBounds())
}

const showLayerInfo = async (el) => {
    const modal = document.querySelector(el.dataset.bsTarget)
    const card = el.closest('.card')
    const layerParams = card.querySelector('.card-footer').dataset.layerParams
    const properties = JSON.parse(layerParams)
    
    const footer = modal.querySelector('.modal-footer')
    footer.setAttribute('data-layer-params', layerParams)

    const title = modal.querySelector('#layerInfoModal-title')
    title.innerText = properties.title
    
    const format = modal.querySelector('#layerInfoModal-format')
    format.innerHTML = card.querySelector('.card-type').innerHTML
    format.firstElementChild.innerText = getLayerFormat(properties) 
    format.firstElementChild.classList.remove('fs-10')
    format.firstElementChild.classList.add('fs-12')
    
    const url = modal.querySelector('#layerInfoModal-url')
    url.innerText = properties.url
    
    const name = modal.querySelector('#layerInfoModal-name')
    name.parentElement.classList.toggle('d-none', properties.type === 'xyz')
    name.innerText = properties.name
    name.parentElement.firstElementChild.innerText = (
        Array('wms', 'wfs').includes(properties.type) ? 'Layer' :
        Array('overpass').includes(properties.type) ? 'Tag' :
        'Name'
    )
    
    const bbox = modal.querySelector('#layerInfoModal-bbox')
    bbox.parentElement.classList.toggle('d-none', Array('overpass', 'xyz').includes(properties.type))
    bbox.innerText = `${properties.bbox.map(i => {
        return Math.ceil(i * 10000000) / 10000000
    }).join(', ')}, EPSG:4326`
    
    const preview = modal.querySelector('#layerInfoModal-preview')
    const previewLabel = preview.parentElement.firstElementChild

    const previewMap = getLeafletMap('layerInfoModal-preview-map')
    previewMap.getContainer().classList.toggle('d-none', properties.type === 'overpass')
    const group = previewMap._handlers.getLayerGroups().library
    group.clearLayers()
    
    const previewThumbnails = modal.querySelector(`#layerInfoModal-thumbnails`)
    previewThumbnails.classList.toggle('d-none', properties.type !== 'overpass')
    const carouselItems = previewThumbnails.querySelector('.carousel-inner')
    carouselItems.innerHTML = ''
    
    if (properties.type === 'overpass') {
        const width = previewThumbnails.offsetWidth
        previewLabel.innerText = 'Distribution Maps'
        previewThumbnails.querySelector(`.carousel-control-prev`).classList.toggle('d-none', properties.thumbnails.length < 2)
        previewThumbnails.querySelector(`.carousel-control-next`).classList.toggle('d-none', properties.thumbnails.length < 2)
        properties.thumbnails.forEach(i => {
            carouselItems.appendChild(customCreateElement({
                className: `carousel-item ${properties.thumbnails[0] === i ? 'active': ''}`,
                innerHTML: `<img src="${i}"} width="${width}" height="${width/360*180}">`,
            }))
        })
    } else {
        const bboxGeoJSON = turf.bboxPolygon(properties.bbox)
        if (Array('wfs').includes(properties.type)) {
            previewLabel.innerText = 'Bounding Box Map'
            const bboxLayer = await getLeafletGeoJSONLayer({
                geojson: bboxGeoJSON,
                group,
                customStyleParams: {
                    strokeColor: 'hsla(0, 100%, 54%, 1.00)',
                    fillOpacity: 0,
                    strokeWidth: 3
                },
            })
            group.addLayer(bboxLayer)
        } else {
            previewLabel.innerText = 'Layer Map'
            addLayerFromData(footer, {map: previewMap, customStyleParams: {
                fillColor: 'hsla(0, 100%, 54%, 1.00)',
                strokeWidth: 3
            }})
        }
        setTimeout(() => {
            previewMap.fitBounds(L.geoJSON(bboxGeoJSON).getBounds())
        }, 500)
    }

    const srid = modal.querySelector('#layerInfoModal-srid')
    srid.parentElement.classList.toggle('d-none', !properties.srid_title)
    srid.innerText = properties.srid_title

    const infoSource = (() => {
        let url
        if (properties.type === 'overpass') {
            if (Array('=', '~').some(i => properties.tags.includes(i))) {
                let [key, value] = properties.tags.split(/[=~]/, 2)
                key = key.split('"')[1]
                value = value.split('"')[1]
                url = `https://taginfo.openstreetmap.org/api/4/tag/overview?key=${key}&value=${value}`
            } else {
                let key = properties.tags.split('"')[1]
                url = `https://taginfo.openstreetmap.org/api/4/key/overview?key=${key}`
            }
        }

        if (properties.format.startsWith('ogc-')) {
            url = `${properties.url}?service=${properties.type.toUpperCase()}&request=GetCapabilities`
        }
        
        if (url) {
            return new URL(url)
        }
    })()
    const hostname = new URL(properties.url).hostname
    const domain = hostname.split('.').slice(-2).join('.')

    const abstract = modal.querySelector('#layerInfoModal-abstract')
    abstract.parentElement.classList.toggle('d-none', !properties.abstract?.trim())
    abstract.parentElement.firstElementChild.innerText = properties.type === 'overpass' ? 'Description' : 'Abstract'
    abstract.innerHTML = `${properties.abstract?.trim()} (Retreived from <a target="_blank" href="${infoSource?.href}">${infoSource?.hostname}</a>)`
    
    const attribution = modal.querySelector('#layerInfoModal-attribution')
    attribution.innerHTML = (
        Array('', null, undefined, 'none').includes((properties.attribution ?? '').trim().toLowerCase()) 
        ? `Retreived from <a target="_blank" href="${properties.url}">${hostname}</a>, hosted by <a target="_blank" href="https://${domain}">${domain}</a>` 
        : properties.attribution
    )

    const fees = modal.querySelector('#layerInfoModal-fees')
    fees.parentElement.classList.toggle('d-none', Array('', null, undefined, 'none').includes((properties.fees ?? '').trim().toLowerCase()))
    fees.innerHTML = properties.fees?.trim()

    const styles = modal.querySelector('#layerInfoModal-styles')
    const stylesObj = typeof properties.styles === 'object' ? properties.styles : JSON.parse(properties.styles || '{}')
    styles.parentElement.classList.toggle('d-none', !Object.keys(stylesObj).length)
    styles.innerHTML = Object.keys(stylesObj).map(i => {
        return `Name: ${i}<br>Title: ${stylesObj[i].title}<br>Legend:<br><img src="${stylesObj[i].legend}">`
    }).join('<br>')
    }

const addSearchResultBboxToMap = async (el) => {
    const addBtn = el.previousElementSibling
    const properties = JSON.parse(addBtn.parentElement.dataset.layerParams)
    const group = getSearchMap()._handlers.getLayerGroups().search
    const strokeColor = manageHSLAColor(rgbToHSLA(el.closest('.card').querySelector(`.card-body span[title="${properties.type}"]`).style.backgroundColor))
    
    const customStyleParams = {
        strokeColor: strokeColor.toString(),
        strokeOpacity: 1,
        strokeWidth: 3,
        dashArray: `3 6`,
        dashOffset: strokeColor.h
    }

    const layer = await getLeafletGeoJSONLayer({
        geojson: turf.polygonToLine(turf.bboxPolygon(
            properties.bbox, 
            {properties}
        )),
        pane: 'searchPane',
        group,
        customStyleParams,
        params: {type: 'geojson', name: 'search result'}
    })

    if (layer) {
        layer._addBtn = addBtn
        group?.addLayer(layer)
    }
}

const toggleSearchResultBbox = async (event) => {
    const searchResults = document.querySelector('#searchResults')
    const map = getSearchMap()
    const group = map?._handlers.getLayerGroups().search
    
    if (group?.getLayers().length) {
        group.clearLayers()
        map.getPane('searchPane').innerHTML = ''
    } else {
        for (i of Array.from(searchResults.querySelectorAll(`[onclick="zoomToSearchResultBbox()"]`))) {
            await addSearchResultBboxToMap(i)
        }
    }

    const el = event.target
    const hasLayers = (group?.getLayers().length ?? 0) > 0
    el.classList.toggle('bi-eye', !hasLayers)
    el.classList.toggle('bi-eye-slash', hasLayers)
}

document.addEventListener('DOMContentLoaded', () => {
    const form = getSearchForm()
    const queryField = form.elements.query
    
    form.addEventListener('submit', (e) => e.preventDefault())
    
    form.addEventListener('htmx:configRequest', (e) => {
        const requestParams = e.detail.parameters
    
        if (!Object.keys(requestParams).includes('clear')){
            const urlParams = Object.fromEntries(new URLSearchParams(window.location.search))
    
            for (const key in urlParams) {
                if (Object.keys(requestParams).includes(key)) continue
                if (!urlParams[key]) continue
                requestParams[key] = urlParams[key]
            }
        }
    
        Object.keys(requestParams).forEach(key => {
            if (requestParams.get(key)) return
            requestParams.delete(key)
        })
    })
    
    form.addEventListener('htmx:beforeRequest', (e) => {
        if (!queryField.value) return e.preventDefault()
    
        document.querySelector('#searchResultsFiltersContainer').innerHTML = ''
        document.querySelector('#searchResults').innerHTML = removeWhitespace(`
            <div class="flex-grow-1 mt-5 d-flex justify-content-center gap-3">
                <div class="spinner-grow spinner-grow-sm text-primary my-3" role="status"></div>
                <div class="spinner-grow spinner-grow-sm text-primary my-3" role="status"></div>
                <div class="spinner-grow spinner-grow-sm text-primary my-3" role="status"></div>
            </div>
        `)
    
        const map = getSearchMap()
        if (map) {
            map._handlers.getLayerGroups().search.clearLayers()
            map.getPane('searchPane').innerHTML = ''
        }
    
        const urlParams = e.detail.pathInfo.finalRequestPath.split('?')
        window.history.pushState(
            {}, '', `${window.location.pathname}?${urlParams[urlParams.length-1]}`
        )
    })
    
    form.addEventListener('htmx:afterSwap', (e) => {
        const map = getSearchMap()
        if (map) Array.from(form.querySelectorAll(`[data-map-bbox-field="true"]`)).forEach(i => {
            i.value = JSON.stringify(turf.bboxPolygon(getLeafletMapBbox(map)).geometry)
        })
    
    })

    document.addEventListener('htmx:responseError', (e) => {
        if (e.detail.requestConfig.path.startsWith('/htmx/library/search/')) {
            const target = e.detail.target
            target.classList.remove('htmx-indicator')
            target.innerHTML = customCreateElement({tag:'div', innerHTML: 'Server error. Please try again.', className: 'd-flex w-100 justify-content-center'}).outerHTML
        }
    })
    
    const searchResults = document.querySelector('#searchResults')
    searchResults.parentElement.addEventListener('htmx:afterSwap', (e) => {
        if (e.target.id === searchResults.id) return
        if (!form.querySelector(`[onclick="toggleSearchResultBbox(event)"]`)?.classList.contains('bi-eye-slash')) return
    
        const el = e.target.querySelector(`[onclick="zoomToSearchResultBbox()"]`)
        if (el) addSearchResultBboxToMap(el)
    })
    
    if (queryField.value) {
        const submitEvent = new Event('submit')
        form.dispatchEvent(submitEvent)

        const offcanvas = form.closest('.offcanvas')
        if (offcanvas) bootstrap.Offcanvas.getOrCreateInstance(offcanvas).show()
    }
})

document.addEventListener('DOMContentLoaded', () => {
    const layerInfoModal = document.querySelector(`#layerInfoModal`)
    layerInfoModal.addEventListener('shown.bs.modal', (e) => {
        showLayerInfo(e.relatedTarget)
    })
})