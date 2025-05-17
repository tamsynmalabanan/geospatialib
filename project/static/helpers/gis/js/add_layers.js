const handleAddLayersForm = () => {
    const modalElement = document.querySelector(`#addLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    
    const form = document.querySelector(`#addLayersForm`)
    const sourceRadios = Array.from(form.elements.source)
    const fileInput = form.elements.files
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit

    modalElement.addEventListener('hide.bs.modal', () => {
        delete form._leafletMap
    })

    // update names value
    submitBtn.addEventListener('click', async (e) => {
        const map = form._leafletMap
        const group = map._ch.getLayerGroups().client
        
        if (isFileSource()) {
            const filesArray = await getValidFilesArray(fileInput.files)
            for (const file of filesArray) {
                fileToLeafletLayer({
                    file,
                    group,
                    add:true,
                    suppFiles:filesArray,
                })
            }
        } else {
            const url = form.elements.url.value
            const format = form.elements.format.value
            const names = [] // update

            for (const name of names) {
                urlToLeafletLayer({
                    url,
                    format,
                    name: name.value, 
                    title: name.properName,
                    group,
                    add:true
                })
            }
        }
        
        resetBtn.click()
        modalInstance.hide()
    })

    let toggleSubmitBtnTimeout
    const toggleSubmitBtn = () => {
        clearTimeout(toggleSubmitBtnTimeout)
        toggleSubmitBtnTimeout = setTimeout(() => {
            const layerNames = form.querySelector(`#addLayersForm-layerNames`)
            console.log(layerNames, layerNames.innerHTML === '')
            submitBtn.disabled = isFileSource() ? !fileInput.files.length : layerNames.innerHTML === ''
            console.log(submitBtn)
        }, 100);
    }

    resetBtn.addEventListener('click', (e) => {
        fileInput.value = ''
        
        const urlField = form.elements.url
        if (urlField.value) {
            urlField.value = ''

            const formatField = form.elements.format
            formatField.value = ''
            formatField.disabled = true
        
            const layerNames = form.querySelector(`#addLayersForm-layerNames`)
            layerNames.innerHTML = ''
        }

        toggleSubmitBtn()
    })

    const isFileSource = () => {
        return sourceRadios.find(i => i.checked).value === 'files'
    }

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            fileInput.classList.toggle('d-none', !isFileSource())
            
            const urlFields = form.querySelector(`#addLayersForm-urlFields`)
            urlFields.classList.toggle('d-none', isFileSource())

            toggleSubmitBtn()
        })
    })

    fileInput.addEventListener('change', toggleSubmitBtn)
    

    document.addEventListener('htmx:beforeRequest', (e) => {
        console.log(e)
    })

    document.addEventListener('htmx:afterSwap', (e) => {
        console.log(e)
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleAddLayersForm()
})
