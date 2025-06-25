const handleGSLLayers = (layers, container) => {
    container.innerHTML = ''

    const selectAllDiv = customCreateElement({
        className: `d-flex gap-2 align-items-center sticky-top text-bg-${getPreferredTheme()} pt-2`
    })
    container.appendChild(selectAllDiv)

    const selectAllCheckbox = customCreateElement({
        parent: selectAllDiv,
        tag: 'input',
        className: 'form-check-input mt-0',
        attrs: {
            type: 'checkbox',
            value: 'all'
        },
    })

    const selectAllLabel = customCreateElement({
        parent: selectAllDiv,
        tag: 'input',
        className: 'form-control border-0 box-shadow-none',
        attrs: {
            readonly: true,
            value: `Select all layers (${Object.keys(layers).length})`
        },
    })
}

const handleExportLayersForm = () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const form = modalElement.querySelector(`#exportLayersForm`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    const modalBody = modalElement.querySelector('.modal-body')
    
    let layers

    const resetLayers = async () => {
        layers = JSON.parse(localStorage.getItem(`legend-layers-${form._leafletMap.getContainer().id}` ?? '{}'))
        
        for (const layer of Object.values(layers)) {
            if (layer.dbIndexedKey.startsWith('client')) {
                layer.data = await getFromGISDB(layer.dbIndexedKey)
            }
        }

        handleGSLLayers(layers, modalBody)

        toggleSubmitBtn()
    }

    const toggleSubmitBtn = () => {
        const checkedLayer = Array.from(modalBody.querySelectorAll('.form-check-input')).find(i => i.checked)
        submitBtn.disabled = checkedLayer ? false : true
    }

    modalElement.addEventListener('show.bs.modal', async () => resetLayers())

    resetBtn.addEventListener('click', (e) => resetLayers())

    submitBtn.addEventListener('click', (e) => {
        // update to included only checked layers

        const data = JSON.stringify(compressJSON.compress(layers))
        const blob = new Blob([data], {type:'application/json'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `map.gsl`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    })

    form.addEventListener('click', (e) => {
        if (!e.target.matches(`.form-check-input[type="checkbox"]`)) return

        const [selectAllCheckbox, ...layerCheckboxes] = Array.from(
            modalBody.querySelectorAll(`.form-check-input[type="checkbox"]`)
        )

        if (e.target === selectAllCheckbox) {
            layerCheckboxes.forEach(i => i.checked = e.target.checked)
        } else {
            selectAllCheckbox.checked = layerCheckboxes.every(i => i.checked)
        }
        
        toggleSubmitBtn()
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleExportLayersForm()
})