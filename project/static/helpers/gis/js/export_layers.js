const handleExportLayersForm = () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const form = modalElement.querySelector(`#exportLayersForm`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit

    // submitBtn.addEventListener('click', (e) => {

    // })
}

document.addEventListener('DOMContentLoaded', () => {
    handleExportLayersForm()
})