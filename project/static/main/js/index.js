const handleSearchForm = () => {
    const form = document.querySelector('#searchLibraryForm')

    form.addEventListener('submit', (e) => e.preventDefault())

}

document.addEventListener('DOMContentLoaded', () => {
    handleSearchForm()
})