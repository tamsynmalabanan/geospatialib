const handleSearchForm = () => {
    const form = document.querySelector('#searchLibraryForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => {
        e.preventDefault()

        const params = {}
        Array.from(form.querySelectorAll('form-control')).forEach(i => {
            params[i.getAttribute('name')] = i.value
        })

        setURLParams(params)
    })

    if (queryField.value) {
        const submitEvent = new Event('submit')
        form.dispatchEvent(submitEvent)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})