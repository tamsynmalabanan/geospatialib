const handleAddLayersForm = () => {
    const modalElement = document.querySelector(`#addLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const formId = 'addLayersForm'
    const form = modalElement.querySelector(`#${formId}`)
    const sourceRadios = Array.from(form.elements.source)
    const fileInput = form.elements.files
    const mapInput = form.elements.map
    const fileFields = form.querySelector(`#${formId}-fileFields`)
    const urlFields = form.querySelector(`#${formId}-urlFields`)
    const gslFields = form.querySelector(`#${formId}-gslFields`)
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    
    const getLayerNamesContainer = (source) => form.querySelector(`#${formId}-${source}-layerNames`)

    const getFileSource = () => sourceRadios.find(i => i.checked).value

    const toggleSubmitBtn = () => {
        const container = getLayerNamesContainer(getFileSource())
        const checkedLayer = Array.from(container.querySelectorAll('.form-check-input')).find(i => i.checked)
        submitBtn.disabled = checkedLayer ? false : true
    }

    const resetLayerNames = (source) => {
        getLayerNamesContainer(source).innerHTML = ''
        toggleSubmitBtn()
    }

    const resetFormatField = () => {
        const formatField = form.elements.format
        formatField.value = ''
        formatField.classList.remove('is-invalid')
        formatField.disabled = true
        resetLayerNames('url')
    }

    const resetUrlFields = () => {
        const urlField = form.elements.url
        urlField.value = ''
        urlField.classList.remove('is-invalid')
        resetFormatField()
    }

    const resetForm = (e) => {
        fileInput.value = ''
        mapInput.value = ''

        resetLayerNames('files')
        resetLayerNames('gsl')
        resetUrlFields()        
        
        toggleSubmitBtn()
    }

    const getIncludedLayers = (source) => {
        const container = getLayerNamesContainer(source)
        const layerCheckboxes = Array.from(container.querySelectorAll('.form-check-input')).slice(1)
        const includedLayers = {}
        layerCheckboxes.forEach(i => {
            if (!i.checked) return

            const params = {}
            Array.from(i.parentElement.querySelectorAll('input')).forEach(j => {
                if (i === j) return

                const name = j.getAttribute('name')
                if (!name) return
                
                params[name] = j.value
            })

            includedLayers[i.value] = params
        })
        return includedLayers
    }
    
    form.addEventListener('submit', (e) => e.preventDefault())

    submitBtn.addEventListener('click', async (e) => {
        const map = form._leafletMap
        const group = map._ch.getLayerGroups().client
        
        const source = getFileSource()
        const includedLayers = getIncludedLayers(source)

        if (source === 'files') {
            const filesArray = await getValidFilesArray(fileInput.files)
            for (const file of filesArray) {
                if (!Object.keys(includedLayers).includes(file.name)) continue
                const params = includedLayers[file.name]
                fileToLeafletLayer({
                    file,
                    group, 
                    add:true,
                    filesArray,
                    params,
                })
            }
        } else {
            const url = form.elements.url.value
            const format = form.elements.format.value
            for (const name in includedLayers) {
                const params = {...includedLayers[name], url, format, name}
                urlToLeafletLayer({
                    group,
                    add:true,
                    params,
                })
            }

            const element = getLayerNamesContainer(source).querySelector('[hx-trigger="update-collection"')
            if (element && Object.values(includedLayers).some(i => Object.keys(i).some(j => {
                if (j === 'title') return false

                let field = form.elements[j]
                field = field.length ? Array.from(field)[0] : field
                if (field.hidden) return false

                return i[j] !== ''
            }))) {
                try {
                    const vals = {
                        ...JSON.parse(element.getAttribute('hx-vals')),
                        layers: includedLayers,
                    }
                    element.setAttribute('hx-vals', JSON.stringify(vals))
                    
                    const event = new Event("update-collection", { bubbles: true })
                    element.dispatchEvent(event)
                } catch (error) {
                    console.log(error)
                }
            }
        }
        
        resetForm()
        modalInstance.hide()
    })

    resetBtn.addEventListener('click', resetForm)

    sourceRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            const source = getFileSource()
            
            fileFields.classList.toggle('d-none', source !== 'files')
            getLayerNamesContainer('files').classList.toggle('d-none', source !== 'files')
            
            urlFields.classList.toggle('d-none', source !== 'url')
            getLayerNamesContainer('url').classList.toggle('d-none', source !== 'url')
            
            gslFields.classList.toggle('d-none', source !== 'gsl')
            getLayerNamesContainer('gsl').classList.toggle('d-none', source !== 'gsl')
            
            toggleSubmitBtn()
        })
    })
    
    fileInput.addEventListener('change', async (e) => {
        if (!fileInput.files.length) return resetLayerNames('files')

        const layerNames = (await getValidFilesArray(fileInput.files)).map(i => i.name)
        fileInput.setAttribute('hx-vals', JSON.stringify({'layerNames': JSON.stringify(layerNames)}))

        const event = new Event("get-file-forms", { bubbles: true })
        fileInput.dispatchEvent(event)
    })

    mapInput.addEventListener('change', async (e) => {
        if (!mapInput.files.length) return resetLayerNames('gsl')

        const container = getLayerNamesContainer('gsl')
        const data = compressJSON.decompress((await getFileRawData(mapInput.files[0])))
        container.innerText = data

        toggleSubmitBtn()
    })

    form.addEventListener('click', (e) => {
        if (!e.target.matches(`.form-check-input[type="checkbox"]`)) return

        const [selectAllCheckbox, ...layerCheckboxes] = Array.from(
            getLayerNamesContainer(getFileSource())
            .querySelectorAll(`.form-check-input[type="checkbox"]`)
        )

        if (e.target === selectAllCheckbox) {
            layerCheckboxes.forEach(i => i.checked = e.target.checked)
        } else {
            selectAllCheckbox.checked = layerCheckboxes.every(i => i.checked)
        }
        
        toggleSubmitBtn()
    })

    const spinnerHTML = removeWhitespace(`
        <div class="d-flex justify-content-center m-3 gap-2">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span role="status">Fetching layers...</span>
        </div>
    `)

    form.addEventListener('htmx:configRequest', (e) => {
        if (e.target === form.elements.format) {
            e.detail.parameters['url'] = form.elements.url.value
        }
    })
    
    form.addEventListener('htmx:beforeRequest', async (e) => {
        if (e.target === form.elements.url) {
            try {
                resetFormatField()
                getLayerNamesContainer('url').innerHTML = spinnerHTML
                return new URL(e.target.value)
            } catch {
                resetUrlFields()
            }
        }
        
        if (e.target === form.elements.format) {
            resetLayerNames('url')
            getLayerNamesContainer('url').innerHTML = spinnerHTML
            return
        }

        if (e.target === fileInput && e.target.files.length) return

        if (e.target.matches(`[hx-trigger="update-collection"]`)) return

        e.preventDefault()
        toggleSubmitBtn()
    })

    form.addEventListener('htmx:beforeSwap', (e) => {
        if (e.target.id === `${formId}-urlFields`) {
            getLayerNamesContainer('url').innerHTML = ''
        }
    })

    form.addEventListener('htmx:afterSwap', (e) => {
        toggleSubmitBtn()
    })

    form.addEventListener('htmx:responseError', (e) => {
        if (e.detail.pathInfo.requestPath !== '/htmx/collection/validate/') return
        e.target.classList.add('is-invalid')
        if (e.target.name === 'url') {
            e.target.nextElementSibling.querySelector('ul').innerText = 'Unable to inspect URL content.'
            resetFormatField()
        }
        if (e.target.name === 'format') {
            e.target.nextElementSibling.querySelector('ul').innerText = 'Unable to retrieve layers.'
            resetUrlFields()
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    handleAddLayersForm()
})