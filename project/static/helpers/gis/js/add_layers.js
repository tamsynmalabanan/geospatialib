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
    const getUrlLayerNames = () => form.querySelector(`#addLayersForm-url-layerNames`)

    modalElement.addEventListener('hide.bs.modal', () => {
        delete form._leafletMap
    })

    const isFileSource = () => {
        return sourceRadios.find(i => i.checked).value === 'files'
    }

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
            submitBtn.disabled = (
                isFileSource() 
                ? filesLayerNames?.innerHTML.trim() === '' 
                : getUrlLayerNames()?.innerHTML.trim() === ''
            )
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
        resetLayerNames('files')
        resetUrlFields()        
        toggleSubmitBtn()
    })

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            fileFields.classList.toggle('d-none', !isFileSource())
            urlFields.classList.toggle('d-none', isFileSource())
            toggleSubmitBtn()
        })
    })
    
    fileInput.addEventListener('htmx:configRequest', async (e) => {
        if (fileInput.files.length) {
            const filenames = (await getValidFilesArray(fileInput.files)).map(i => i.name).join(',')
            fileInput.setAttribute('hx-vals', `{"filenames": "${filenames}"}`)
            // e.detail.parameters['filenames'] = filenames
        }

        // const event = new Event("get-file-forms", { bubbles: true })
        // fileInput.dispatchEvent(event)
    })
    
    form.addEventListener('htmx:beforeRequest', async (e) => {
        if (e.target === form.elements.url) {
            try {
                new URL(e.target.value)
                return
            } catch {
                resetUrlFields()
            }
        }

        if (e.target === fileInput) {
            if (e.target.files.length) {
                const filenames = (await getValidFilesArray(fileInput.files)).map(i => i.name).join(',')
                e.detail.configRequest.parameters['filenames'] = filenames
                // fileInput.setAttribute('hx-vals', `{"filenames": "${filenames}"}`)
    
                return console.log(e)
            }
            resetLayerNames('files')
        }

        e.preventDefault()
        toggleSubmitBtn()
    })

    form.addEventListener('htmx:afterSwap', (e) => {
        toggleSubmitBtn()
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleAddLayersForm()
})