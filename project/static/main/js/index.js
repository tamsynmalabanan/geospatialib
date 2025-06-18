const handleSearchForm = () => {
    const form = document.querySelector('#searchLibraryForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => e.preventDefault())

    form.addEventListener('htmx:beforeRequest', (e) => {
        if (queryField.value) {
            const resultsContainer = document.querySelector('#searchLibraryResults')
            .innerHTML = '<div class="flex-grow-1 d-flex jusitfy-content-center"><div class="spinner-border" role="status"></div><div class="ms-2"></div></div>'

            const params = {}
            Array.from(form.elements).forEach(i => {
                const name = i.getAttribute('name')
                if (!name) return
                params[name] = i.value
            })
            setURLParams(params)
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