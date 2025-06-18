const handleSearchForm = () => {
    const form = document.querySelector('#searchLibraryForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => e.preventDefault())

    if (queryField.value) {
        const submitEvent = new Event('submit')
        form.dispatchEvent(submitEvent)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})