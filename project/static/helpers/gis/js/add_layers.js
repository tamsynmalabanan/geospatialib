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
    const getLayerNamesContainer = (source) => form.querySelector(`#addLayersForm-${source}-layerNames`)

    const isFileSource = () => {
        return sourceRadios.find(i => i.checked).value === 'files'
    }
    let toggleSubmitBtnTimeout
    const toggleSubmitBtn = () => {
        clearTimeout(toggleSubmitBtnTimeout)
        toggleSubmitBtnTimeout = setTimeout(() => {
            submitBtn.disabled = (
                isFileSource() 
                ? getLayerNamesContainer('files')?.innerHTML.trim() === '' 
                : getLayerNamesContainer('url')?.innerHTML.trim() === ''
            )
        }, 100);
    }

    const resetLayerNames = (source) => {
        getLayerNamesContainer(source).innerHTML = ''
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

    const resetForm = (e) => {
        fileInput.value = ''
        resetLayerNames('files')
        resetUrlFields()        
        toggleSubmitBtn()
    }

    const getIncludedLayers = (source) => {
        const container = getLayerNamesContainer(source)
        const layerCheckboxes = Array.from(container.querySelectorAll('.form-check-input')).filter(i => i.value !== 'all')
        const includedLayers = {}
        layerCheckboxes.forEach(i => {
            if (!i.checked) return

            const inputGroup = i.closest('.input-group')
            const params = {title: inputGroup.querySelector('input[name="title"]')?.value ?? i.value}
            console.log(inputGroup.lastChild.children)
            Array.from(inputGroup.lastChild.children ?? []).forEach(i => {
                const name = i.getAttribute('name')
                const value = i.value
                console.log(name, value)
                if (!value || !name) return
                params[i.getAttribute('name')] = value
            })
            includedLayers[i.value] = params
        })
        return includedLayers
    }
    
    modalElement.addEventListener('hide.bs.modal', () => {
        delete form._leafletMap
    })

    // update names value
    submitBtn.addEventListener('click', async (e) => {
        const map = form._leafletMap
        const group = map._ch.getLayerGroups().client
        
        const source = isFileSource() ? 'files' : 'url'
        const includedLayers = getIncludedLayers(source)
        if (isFileSource()) {
            console.log(includedLayers)
            const filesArray = await getValidFilesArray(fileInput.files)
            for (const file of filesArray) {
                if (!Object.keys(includedLayers).includes(file.name)) continue
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
        
        resetForm()
        modalInstance.hide()
    })

    resetBtn.addEventListener('click', resetForm)

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            fileFields.classList.toggle('d-none', !isFileSource())
            urlFields.classList.toggle('d-none', isFileSource())
            toggleSubmitBtn()
        })
    })
    
    fileInput.addEventListener('change', async (e) => {
        if (fileInput.files.length) {
            const filenames = (await getValidFilesArray(fileInput.files)).map(i => i.name).join('|')
            fileInput.setAttribute('hx-vals', `{"filenames": "${filenames}"}`)
        }

        const event = new Event("get-file-forms", { bubbles: true })
        fileInput.dispatchEvent(event)
    })

    form.addEventListener('click', (e) => {
        if (!e.target.matches(`.form-check-input`) || !e.target.dataset.layerSource) return
        
        const source = e.target.dataset.layerSource
        const container = getLayerNamesContainer(source)
        const selectAllCheckbox = container.querySelector('.form-check-input[value="all"]')
        const layerCheckboxes = Array.from(container.querySelectorAll(`.form-check-input`)).filter(i => i !== selectAllCheckbox)
        
        if (e.target === selectAllCheckbox) {
            layerCheckboxes.forEach(i => i.checked = e.target.checked)
        } else {
            selectAllCheckbox.checked = layerCheckboxes.some(i => i.checked)
        }
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
            if (e.target.files.length) return
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