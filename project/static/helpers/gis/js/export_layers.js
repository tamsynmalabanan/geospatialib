const handleExportLayersForm = () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const form = modalElement.querySelector(`#exportLayersForm`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    const modalBody = modalElement.querySelector('.modal-body')

    modalElement.addEventListener('show.bs.modal', async () => {
        modalBody.innerHTML = ''
        
        const layers = JSON.parse(localStorage.getItem(`legend-layers-${form._leafletMap.getContainer().id}` ?? '{}'))
        for (const layer of layers) {
            if (layer.dbIndexedKey.startsWith('client')) {
                layer.data = await getFromGISDB(layer.dbIndexedKey)
            }

            console.log(layer)
            
            // modalBody.appendChild(customCreateElement({
            //     innerHTML:layer.dbIndexedKey
            // }))
        }

    })

    // submitBtn.addEventListener('click', (e) => {

    // })
}

document.addEventListener('DOMContentLoaded', () => {
    handleExportLayersForm()
})