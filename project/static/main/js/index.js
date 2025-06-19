const handleSearchForm = () => {
    const form = document.querySelector('#searchForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => e.preventDefault())

    form.addEventListener('htmx:configRequest', (e) => {
        console.log(e)
    })
    
    form.addEventListener('htmx:beforeRequest', (e) => {
        console.log(e)
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