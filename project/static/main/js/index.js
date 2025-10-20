const getSearchForm = () => document.querySelector('#searchForm')

const getSearchMap = () => (window.maps ?? []).find(map => map.getContainer().id === getSearchForm().getAttribute('data-form-map-id'))

const zoomToSearchResultBbox = () => {
    const layerParams = event.target.parentElement.dataset.layerParams
    return getSearchMap()?.fitBounds(L.geoJSON(
        turf.bboxPolygon(JSON.parse(layerParams).bbox)
    ).getBounds())
}

const showLayerInfo = (el) => {
    const modal = document.querySelector(el.dataset.bsTarget)
    const card = el.closest('.card')
    const layerParams = card.querySelector('.card-footer').dataset.layerParams
    const properties = JSON.parse(layerParams)
    console.log(properties)
    
    const footer = modal.querySelector('.modal-footer')
    footer.setAttribute('data-layer-params', layerParams)

    const title = modal.querySelector('#layerInfoModal-title')
    title.innerText = properties.title
    
    const format = modal.querySelector('#layerInfoModal-format')
    format.innerHTML = `${
        properties.format === 'file' 
        ? `${properties.type.toUpperCase()} ` 
        : ''
    }${COLLECTION_FORMATS[properties.format]}`
    
    const url = modal.querySelector('#layerInfoModal-url')
    url.innerText = properties.url
    
    const name = modal.querySelector('#layerInfoModal-name')
    name.parentElement.classList.toggle('d-none', properties.type === 'xyz')
    name.parentElement.firstElementChild.innerText = (
        Array('wms', 'wfs').includes(properties.type) ? 'Layer' :
        Array('overpass').includes(properties.type) ? 'Tag' :
        'Name'
    )
    name.innerText = properties.name
    
    const bbox = modal.querySelector('#layerInfoModal-bbox')
    bbox.innerText = properties.bbox.map(i => Math.ceil(i * 10000000) / 10000000).join(', ')
    
    const preview = modal.querySelector('#layerInfoModal-preview')
    preview.parentElement.classList.toggle('d-none', properties.type === 'overpass')

    const previewMap = getLeafletMap('layerInfoModal-preview-map')
    const group = previewMap._handlers.getLayerGroups().library
    group.clearLayers()
    
    if (properties.type !== 'overpass') {
        const previewLabel = preview.parentElement.firstElementChild
        const bboxLayer = L.geoJSON(turf.bboxPolygon(properties.bbox))
        if (Array('wfs').includes(properties.type)) {
            previewLabel.innerText = 'Bounding Box Map'
            group.addLayer(bboxLayer)
        } else {
            previewLabel.innerText = 'Layer Map'
            addLayerFromData(footer, {map: previewMap})
        }
        setTimeout(() => {
            previewMap.fitBounds(bboxLayer.getBounds())
        }, 100)
    }
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