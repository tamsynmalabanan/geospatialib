const handleSearchForm = () => {
    const form = document.querySelector('#searchForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => e.preventDefault())

    form.addEventListener('htmx:configRequest', (e) => {
        const requestParams = e.detail.parameters
        console.log(requestParams.ownKeys())

        if (!Object.keys(requestParams).includes('clear')){
            const urlParams = Object.fromEntries(new URLSearchParams(window.location.search))
            console.log(urlParams)

            for (const key in urlParams) {
                if (Object.keys(requestParams).includes(key)) continue
                requestParams[key] = urlParams[key]
            }
        }

        console.log('query',requestParams.get('query'))
        console.log('type',requestParams.get('type'))
        console.log('bbox',requestParams.get('bbox__bboverlaps'))
    })
    
    form.addEventListener('htmx:beforeRequest', (e) => {
        if (queryField.value) {
            document.querySelector('#searchResultsFiltersContainer').innerHTML = ''
            document.querySelector('#searchResults').innerHTML = removeWhitespace(`
                <div class="flex-grow-1 d-flex justify-content-center mt-5">
                    <div class="spinner-border" role="status"></div>
                </div>
            `)

            const urlParams = e.detail.pathInfo.finalRequestPath.split('?')
            window.history.pushState(
                {}, '', `${window.location.pathname}?${urlParams[urlParams.length-1]}`
            )
        } else {
            e.preventDefault()
        }
    })

    form.addEventListener('htmx:afterSwap', (e) => {
        Array.from(form.querySelectorAll(`[name='bbox__bboverlaps']`)).forEach(i => {
            if (i.value) return

            const map = maps.find(map => map.getContainer().id === i.getAttribute('data-bbox-field-for'))
            if (!map) return
            
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