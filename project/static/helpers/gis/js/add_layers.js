const handleAddLayersForm = () => {
    const modalElement = document.querySelector(`#addLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    
    const form = document.querySelector(`#addLayersForm`)
    const sourceRadios = Array.from(form.elements.source)
    const fileInput = form.elements.files
    const fileFields = form.querySelector(`#addLayersForm-fileFields`)
    const urlFields = form.querySelector(`#addLayersForm-urlFields`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    const filesLayerNames = form.querySelector(`#addLayersForm-files-layerNames`)


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
            const urlLayerNames = form.querySelector(`#addLayersForm-url-layerNames`)
            console.log(urlLayerNames.innerHTML)
            submitBtn.disabled = isFileSource() ? !filesLayerNames?.innerHTML : !urlLayerNames?.innerHTML
        }, 100);
    }

    const resetLayerNames = (source) => {
        const layerNames = form.querySelector(`#addLayersForm-${source}-layerNames`)
        layerNames.innerHTML = ''
    }

    const resetFormatField = () => {
        const formatField = form.elements.format
        formatField.value = ''
        formatField.disabled = true
        resetLayerNames('url')
    }

    const resetUrlFields = () => {
        const urlField = form.elements.url
        urlField.value = ''
        resetFormatField()
    }

    resetBtn.addEventListener('click', (e) => {
        fileInput.value = ''
        resetUrlFields()        
        toggleSubmitBtn()
    })

    const isFileSource = () => {
        return sourceRadios.find(i => i.checked).value === 'files'
    }

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            fileFields.classList.toggle('d-none', !isFileSource())
            urlFields.classList.toggle('d-none', isFileSource())
            toggleSubmitBtn()
        })
    })
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files)

        toggleSubmitBtn()
    })
    
    document.addEventListener('htmx:beforeRequest', (e) => {
        if (e.detail.target.id !== urlFields.id) return
        if (e.target === form.elements.url) {
            try {
                return new URL(e.target.value)
            } catch {
                e.preventDefault()
                resetUrlFields()
            }
        }
    })

    document.addEventListener('htmx:afterSwap', (e) => {
        if (e.detail.target.id !== urlFields.id) return
        toggleSubmitBtn()
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleAddLayersForm()
})