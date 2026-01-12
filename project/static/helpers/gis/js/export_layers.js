document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.querySelector(`#exportLayersModal`)
    if (!modalElement) return
    
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
        
        if (layers) {
            for (const layer of Object.values(layers)) {
                let currentKey = layer.indexedDBKey
                if (!currentKey.startsWith('local')) continue
                
                if (layer.editable) {
                    layer.editable = false
                    
                    const properties = getDBKeyProperties(currentKey)
                    currentKey = createLocalLayerDBKey({...properties, version: Number(properties.version ?? 2)-1})
                }
                
                layer.indexedDBKey = currentKey
                layer.data = await getFromGISDB(currentKey)
            }
        
            handleGSLLayers(layers, modalBody)
        } else {
            modalBody.innerHTML = `<div class="d-flex justify-content-center m-3"><span>No layers found.</span></div>`
        }
    
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

