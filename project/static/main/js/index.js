const handleSearchForm = () => {
    const form = document.querySelector('#searchLibraryForm')
    const queryField = form.elements.query

    form.addEventListener('submit', (e) => {
        e.preventDefault()

        const params = {}
        Array.from(form.elements).forEach(i => {
            const name = i.getAttribute('name')
            if (!name) return
            params[name] = i.value
        })
        setURLParams(params)
    })

    form.addEventListener('htmx:beforeRequest', (e) => {
        if (queryField.value) return

        e.preventDefault()
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})