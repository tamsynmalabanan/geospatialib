const getSearchForm = () => document.querySelector('#searchForm')

const getSearchMap = () => maps.find(map => map.getContainer().id === getSearchForm().getAttribute('data-search-map-id'))

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
        group: getSearchMap()?._ch.getLayerGroups().library,
        add: true,
    })
}

const toggleSearchResultBbox = async () => {
    const el = event.target
    const map = getSearchMap()
    const group = map?._ch.getLayerGroups().search
    const layers = group?.getLayers()

    el.classList.toggle('bi-eye', layers.length)
    el.classList.toggle('bi-eye-slash', !layers.length)
}

const handleSearchForm = () => {
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

    if (queryField.value) {
        const submitEvent = new Event('submit')
        form.dispatchEvent(submitEvent)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})