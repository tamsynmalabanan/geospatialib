const handleSearchForm = () => {
    const form = document.querySelector('#searchForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => e.preventDefault())

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

    if (queryField.value) {
        const submitEvent = new Event('submit')
        form.dispatchEvent(submitEvent)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})