const handleGSLLayers = (layers, container) => {
    container.innerHTML = ''
    
    if (!Object.keys(layers).length) return

    const selectAllDiv = customCreateElement({
        parent: container,
        className: `d-flex gap-2 align-items-center sticky-top text-bg-${getPreferredTheme()} pt-2`
    })

    const selectAllCheckbox = customCreateElement({
        parent: selectAllDiv,
        tag: 'input',
        className: 'form-check-input mt-0',
        attrs: {
            type: 'checkbox',
            value: 'all',
            checked: true,
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

    const layersContainer = customCreateElement({
        parent: container,
        className: 'd-flex flex-column gap-2',
    })

    Object.keys(layers).reverse().forEach(i => {
        const data = layers[i]

        const layerContainer = customCreateElement({
            parent: layersContainer,
            className: 'd-flex align-items-center'
        })

        const checkbox = customCreateElement({
            parent: layerContainer,
            tag: 'input',
            className: 'form-check-input mt-0',
            attrs: {
                type: 'checkbox',
                value: i,
                checked: true,
            }
        })

        const titleField = createFormFloating({
            parent: layerContainer,
            containerClass: 'flex-grow-1 ms-2 w-50',
            fieldAttrs: {
                type: 'text',
                name: 'title',
                title: data.params.name,
                value: data.params.title,
            },
            labelText: 'Title',
            events: {
                change: (e) => {
                    const value = e.target.value.trim()
                    if (value) {
                        layers[i].params.title = value
                    }
                }
            }
        })
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const form = modalElement.querySelector(`#exportLayersForm`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    const modalBody = modalElement.querySelector('.modal-body')

    let map
    modalElement.addEventListener('show.bs.modal', (e) => {
        map = getLeafletMap(e.relatedTarget.closest('.leaflet-container').id)
    })
    
    let layers
    
    const resetLayers = async () => {
        modalBody.innerHTML = getSpinnerHTML({text: 'Fetching layers...'})
    
        layers = JSON.parse(localStorage.getItem(`legend-layers-${map.getContainer().id}` ?? '{}'))
        
        for (const layer of Object.values(layers)) {
            let currentKey = layer.dbIndexedKey
            if (!currentKey.startsWith('local')) continue
            
            if (layer.editable) {
                layer.editable = false
                
                const [id, version] = currentKey.split('--version')
                currentKey = `${id}--version${Number(version ?? 2)-1}`
            }
            
            layer.dbIndexedKey = currentKey
            layer.data = await getFromGISDB(currentKey)
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
        let filteredLayers = structuredClone(layers)
    
        const [selectAllCheckbox, ...layerCheckboxes] = Array.from(
            modalBody.querySelectorAll(`.form-check-input[type="checkbox"]`)
        )
        if (!selectAllCheckbox.checked) {
            layerCheckboxes.forEach(i => {
                if (!i.checked) delete filteredLayers[i.value]
            })
        }
    
        const data = JSON.stringify(compressJSON.compress(filteredLayers))
        const blob = new Blob([data], {type:'application/json'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `map.gsl`
        a.click()
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
})

