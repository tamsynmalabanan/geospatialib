const getSearchForm = () => document.querySelector('#searchForm')

const getSearchMap = () => (window.maps ?? []).find(map => map.getContainer().id === getSearchForm().getAttribute('data-form-map-id'))

const zoomToSearchResultBbox = () => getSearchMap()?.fitBounds(L.geoJSON(turf.bboxPolygon(JSON.parse(event.target.dataset.layerBbox))).getBounds())

const addSearchResultToMap = async () => {
    const el = event.target
    const dataset = el.dataset
    const data = JSON.parse(dataset.layerData)
    const params = {
        url: dataset.layerUrl,
        format: dataset.layerFormat,
        name: data.name,
        title: data.title,
        type: data.type,
        id: data.id,
        bbox: JSON.stringify(data.bbox),
        attribution: data.attribution,
        styles: data.styles,
        xField: data.xField,
        yField: data.yField,
        srid: data.srid,
    }

    createLeafletLayer(params, {
        dbIndexedKey: Array(params.format, JSON.stringify({params})).join(';'),
        group: getSearchMap()?._handlers.getLayerGroups().library,
        add: true,
    })
}

const addSearchResultBboxToMap = async (el) => {
    const addBtn = el.previousElementSibling
    const properties = JSON.parse(addBtn.dataset.layerData)
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
            JSON.parse(el.dataset.layerBbox), 
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

const toggleSearchResultBbox = async () => {
    const searchResults = document.querySelector('#searchResults')
    const map = getSearchMap()
    const group = map?._handlers.getLayerGroups().search
    
    if (group?.getLayers().length) {
        group.clearLayers()
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
    
        getSearchMap()?._handlers.getLayerGroups().search.clearLayers()
    
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

    form.addEventListener('htmx:responseError', (e) => {
        if (e.detail.requestConfig.path === '/htmx/library/search/') {
            const target = e.detail.target
            target.classList.remove('htmx-indicator')
            target.innerHTML = ''
            target.appendChild(customCreateElement({tag:'div', innerHTML: 'Server error. Please try again.', className: 'd-flex w-100 justify-content-center'}))
        }
    })
    
    const searchResults = document.querySelector('#searchResults')
    searchResults.parentElement.addEventListener('htmx:afterSwap', (e) => {
        if (e.target.id === searchResults.id) return
        if (!form.querySelector(`[onclick="toggleSearchResultBbox()"]`).classList.contains('bi-eye-slash')) return
    
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