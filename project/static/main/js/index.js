const handleAddLayersForm = () => {
    const isFileSource = () => {
        return Array.from(form.elements.newLayerSource).find(i => i.checked).value === 'Upload files'
    }

    const form = customCreateElement({
        tag: 'form',
        className: 'py-2 px-3 d-flex flex-column gap-3',
        events: {
            submit: async (e) => {
                L.DomEvent.stopPropagation(e)
                L.DomEvent.preventDefault(e)
            
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
                    const url = form.elements.newLayerUrl.value
                    const format = form.elements.newLayerFormat.value
                    const names = Tagify(form.elements.newLayerNames).value

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
                
                menuContainer.remove()
            }
        }
    })

    let toggleSubmitBtnTimeout
    const toggleSubmitBtn = () => {
        clearTimeout(toggleSubmitBtnTimeout)
        toggleSubmitBtnTimeout = setTimeout(() => {
            submitBtn.disabled = isFileSource() ? !fileInput.files.length : !Tagify(form.elements.newLayerNames).value.length
        }, 100);
    }

    const sourceRadios = createCheckboxOptions({
        parent: form,
        name: 'newLayerSource',
        type: 'radio',
        containerClass: 'flex-nowrap gap-2 fs-12',
        options: {
            'Upload files': {
                checked: true,
                labelAttrs: {},
                events: {
                    click: (e) => {
                        urlContainer.classList.add('d-none')
                        fileInput.classList.remove('d-none')
                        toggleSubmitBtn()
                    }
                }
            },
            'Connect to URL': {
                checked: false,
                labelAttrs: {},
                events: {
                    click: (e) => {
                        fileInput.classList.add('d-none')
                        urlContainer.classList.remove('d-none')
                        toggleSubmitBtn()
                    }
                }
            },
        },
    })

    const fileInput = customCreateElement({
        parent: form,
        tag: 'input',
        className: 'form-control form-control-sm fs-12',
        attrs: {
            type: 'file',
            multiple: true,
            accept: '.geojson, .zip'
        },
        events: {
            change: toggleSubmitBtn
        }
    })

    const urlContainer = customCreateElement({
        parent: form,
        className: 'd-none d-flex flex-column gap-2'
    })

    const validateCollection = async () => {
        const urlField = form.elements.newLayerUrl
        const formatField = form.elements.newLayerFormat
        const namesField = Tagify(form.elements.newLayerNames)

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
            // console.log(data)
            const {url, format, names} = data

            urlField.classList.toggle('is-invalid', url === false && urlField.value !== '')
            
            formatField.disabled = !url
            formatField.classList.toggle('is-invalid', format === false && formatField.value !== '')
            formatField.value = url ? format ? format : format === false ? formatField.value : '' : ''
            
            const properNames = Object.values(names ?? {})
            format && properNames?.length 
            ? namesField.DOM.scope.removeAttribute('disabled')
            : namesField.DOM.scope.setAttribute('disabled', true) 
            if (namesField.value.length) namesField.removeAllTags()
            if (url && format && properNames?.length) {
                const whitelist = Object.entries(names).map(([key, value]) => ({
                    value: key,
                    properName: value
                }))
                namesField.settings.whitelist = whitelist
            
                if (properNames.length === 1) {
                    namesField.addTags(whitelist)
                }
            }
            toggleSubmitBtn()
        }
    }

    const urlField = createInputGroup({
        parent: urlContainer,
        prefixHTML: createSpan('URL', {
            className: 'fs-12'
        }),
        fieldClass: 'form-control-sm fs-12',
        fieldAttrs: {
            type: 'url',
            name: 'newLayerUrl',
        },
        events: {
            change: validateCollection
        },
    })

    const formatField = createInputGroup({
        parent: urlContainer,
        prefixHTML: createSpan('Format', {
            className: 'fs-12'
        }),
        fieldTag: 'select',
        fieldClass: 'form-select-sm fs-12',
        fieldAttrs: {
            type: 'url',
            name: 'newLayerFormat',
        },
        disabled: true,
        options: {
            '': 'Select format',
            'file': 'Downloadable File',
            'geojson': 'GeoJSON API',
        },
        events: {
            change: validateCollection
        },
    })

    const namesField = createTagifyField({
        parent: urlContainer,
        inputClass: `w-100 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 fs-12`,
        inputTag: 'textarea',
        delimiters: null,
        enabled: 0,
        disabled: true,
        dropdownClass:  `my-1 border-0`,
        userInput: true,
        scopeStyle: {
            minHeight: '50px',
        },
        name:  `newLayerNames`,
        placeholder: 'Select layer names',
        callbacks: {
            ...(() => Object.fromEntries(['add', 'remove', 'edit'].map(i => [i, toggleSubmitBtn])))()
        }
    })

    const controls = customCreateElement({
        parent: form,
        className: 'd-flex flex-nowrap gap-2'
    })

    const resetBtn = createButton({
        parent: controls,
        className: `btn-sm fs-12 d-flex flex-nowrap justify-content-center btn-${getPreferredTheme()}`,
        iconSpecs: 'bi bi-arrow-counterclockwise fs-12',
        btnAttrs: {
            tabindex: '-1'
        },
        events: {
            click: (e) => {
                fileInput.value = ''

                const urlField = form.elements.newLayerUrl
                if (urlField.value) {
                    urlField.value = ''
                    const event = new Event("change", { bubbles: true })
                    urlField.dispatchEvent(event)
                }

                toggleSubmitBtn()
            }
        }
    })

    const submitBtn = createButton({
        parent: controls,
        className: 'btn-sm fs-12 d-flex flex-nowrap justify-content-center btn-success flex-grow-1',
        iconSpecs: 'me-2 bi-stack',
        innerText: 'Add layers',
        btnAttrs: {
            type: 'submit',
            disabled: true,
        }
    })

    return form
}
