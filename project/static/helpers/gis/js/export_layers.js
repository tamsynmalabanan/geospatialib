const handleExportLayersForm = () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const form = modalElement.querySelector(`#exportLayersForm`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    const modalBody = modalElement.querySelector('.modal-body')

    modalElement.addEventListener('show.bs.modal', () => {
        modalBody.innerHTML = ''
        
        const layers = JSON.parse(localStorage.getItem(`legend-layers-${form._leafletMap.getContainer().id}` ?? '{}'))
        Object.values(layers).forEach(i => {
            
            
            // modalBody.appendChild(customCreateElement({
            //     innerHTML:i.dbIndexedKey
            // }))
        })
    })

    // submitBtn.addEventListener('click', (e) => {

    // })
}

document.addEventListener('DOMContentLoaded', () => {
    handleExportLayersForm()
})