const handleAddLayersForm = () => {
    const form = document.querySelector(`#addLayersForm`)
    const submitBtn = form.elements.addLayersSubmit
    const resetBtn = form.elements.addLayersReset
    const sourceRadios = Array.from(form.elements.addLayersSource)
    const fileInput = form.elements.addLayersFile
    const urlField = form.elements.addLayersUrl
    const formatField = form.elements.addLayersFormat

    const isFileSource = () => {
        return sourceRadios.find(i => i.checked).value === 'files'
    }

    let toggleSubmitBtnTimeout
    const toggleSubmitBtn = () => {
        clearTimeout(toggleSubmitBtnTimeout)
        toggleSubmitBtnTimeout = setTimeout(() => {
            submitBtn.disabled = isFileSource() ? !fileInput.files.length : !namesTagify.value.length
        }, 100);
    }


    const namesTextfield = form.elements.addLayersNames
    const namesTagify = new Tagify(namesTextfield, {
        delimiters: null,
        userInput: true,
        callbacks: {
            ...(() => Object.fromEntries(['add', 'remove', 'edit'].map(i => [i, toggleSubmitBtn])))()
        },
        dropdown: {
            enabled: 0,
            className:  `my-1 border-0`,
        }
    })
    

    const validateCollection = async () => {
        let data

        try {
            data = await htmxFetch(`/htmx/validate_collection/`, {
                method: 'POST',
                data: {
                    url: new URL(urlField.value).href,
                    format: formatField.value
                }   
            }).then(response => {
                return response.json()
            }).catch(error => {
                throw error
            })
        } catch (error) {
            data = {url:false}
        } finally {
            const {url, format, names} = data

            urlField.classList.toggle('is-invalid', url === false && urlField.value !== '')
            
            formatField.disabled = !url
            formatField.classList.toggle('is-invalid', format === false && formatField.value !== '')
            formatField.value = url ? format ? format : format === false ? formatField.value : '' : ''
            
            const properNames = Object.values(names ?? {})
            format && properNames?.length 
            ? namesTagify.DOM.scope.removeAttribute('disabled')
            : namesTagify.DOM.scope.setAttribute('disabled', true) 
            if (namesTagify.value.length) namesTagify.removeAllTags()
            if (url && format && properNames?.length) {
                const whitelist = Object.entries(names).map(([key, value]) => ({
                    value: key,
                    properName: value
                }))
                namesTagify.settings.whitelist = whitelist
            
                if (properNames.length === 1) {
                    namesTagify.addTags(whitelist)
                }
            }
            toggleSubmitBtn()
        }
    }

    const hideModal = () => {
        delete form._currentMap
        
        const modalElement = document.querySelector(`#addLayersModal`)
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
        modalInstance.hide()
    }

    submitBtn.addEventListener('click', async (e) => {
        const map = form._currentMap
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
            const url = urlField.value
            const format = formatField.value
            const names = namesTagify.value

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
        
        hideModal()
    })

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            fileInput.classList.toggle('d-none', !isFileSource())
            fileInput.nextElementSibling.classList.toggle('d-none', isFileSource())
            toggleSubmitBtn()
        })
    })
    fileInput.addEventListener('change', toggleSubmitBtn)
    urlField.addEventListener('change', validateCollection)
    formatField.addEventListener('change', validateCollection)

    resetBtn.addEventListener('click', (e) => {
        fileInput.value = ''

        if (urlField.value) {
            urlField.value = ''
            const event = new Event("change", { bubbles: true })
            urlField.dispatchEvent(event)
        }

        toggleSubmitBtn()
    })

    return form
}

document.addEventListener('DOMContentLoaded', () => {
    handleAddLayersForm()
})