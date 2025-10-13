const handleLeafletStylePanel = (map, parent) => {
    let controller = resetController()

    const form = document.createElement('form')
    form.className = `d-flex flex-grow-1 flex-column text-bg-${getPreferredTheme()} rounded h-100`
    parent.appendChild(form)

    const toolbar = document.createElement('div')
    toolbar.className = 'd-flex p-3 flex-c olumn gap-3'
    form.appendChild(toolbar)

    const select = createInputGroup({
        parent: toolbar,
        prefixHTML: '<span class="fs-12">Layer</span>',
        suffixHTML: `<div class='d-flex flex-nowrap gap-2'></div>`,
        fieldTag: 'select', 
        fieldClass: 'form-select-sm',
        fieldAttrs: {name: 'layer'},
        disabled: true,
    }).querySelector('select')

    const styleOptions = select.nextElementSibling
    styleOptions.appendChild(createIcon({
        peNone: false,
        className: 'bi bi-copy fs-12',
        events: {
            click: () => {
                navigator.clipboard.writeText(JSON.stringify(layer._properties))
            }
        }
    }))
    styleOptions.appendChild(createIcon({
        peNone: false,
        className: 'ms-3 bi bi-clipboard fs-12',
        events: {
            click: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    const _properties = JSON.parse(text)
                    if (!Object.keys(layer._properties).every(i => {
                        return Object.keys(_properties).includes(i)
                    })) return
    
                    const oldStyles = structuredClone(layer._properties)
                    layer._properties = cloneLeafletLayerStyles({_properties})
                    deleteLeafletLayerFillPatterns({_properties:oldStyles})
                    updateLeafletGeoJSONLayer(layer, {
                        geojson: layer.toGeoJSON()
                    })

                    const event = new Event("change", { bubbles: true })
                    select.dispatchEvent(event)
                } catch { return }
            }
        }
    }))

    const body = document.createElement('div')
    body.id = `${map.getContainer().id}-panels-style-body`
    body.className = 'd-flex flex-column flex-grow-1 overflow-auto p-3 d-none border-top gap-3'
    form.appendChild(body)

    let layer
    const mapContainer = map.getContainer()
    const getLayerLegend = () => mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers-${layer._leaflet_id}`)

    const visibilityFieldsClick = (e) => {
        const field = e.target

        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: true,
        })

        contextMenuHandler(e, {
            useCurrent: {
                innerText: `Use current map scale`,
                btnCallback: async () => {
                    const scale = getLeafletMeterScale(map)
                    field.value = scale
                    field.dispatchEvent(changeEvent)
                }
            },
            zoomCurrent: {
                innerText: `Zoom to nearest scale`,
                btnCallback: async () => {
                    const scale = field.value
                    zoomLeafletMapToScale(map, scale)
                }
            },
            useDefault: {
                innerText: `Use default scale`,
                btnCallback: async () => {
                    field.value = field.name.toLowerCase().includes('min') ? 10 : 5000000
                    field.dispatchEvent(changeEvent)
                }
            },
        })
    }

    const updateSymbology = async (styleParams, {refresh=true, updateLocalStorage=true}={}) => {
        const controllerId = controller.id

        await handleStyleParams(styleParams, {controller})
        
        if (refresh && controllerId === controller.id) {
            updateLeafletGeoJSONLayer(layer, {
                geojson: layer.toGeoJSON(),
                controller,
                updateLocalStorage,
            }).then(() => {
                map.setZoom(map.getZoom())
            })
        }

        return styleParams
    }

    const getSymbologyForm = (id) => {
        const legendLayer = getLayerLegend()

        const symbology = layer._properties?.symbology
        const style = (symbology?.groups?.[id]) || symbology?.default
        const styleParams = style?.styleParams
        const collapseId = generateRandomString()

        let updateTimeout
        const update = async () => {
            clearTimeout(updateTimeout)
            updateTimeout = setTimeout(() => {
                updateSymbology(style.active ? styleParams : null)
                updateTimeout = null
            }, 1000)
        }

        const parent = customCreateElement({
            className:'d-flex flex-column flex-grow-1',
        })

        parent.addEventListener('focusin', (e) => {
            if (!updateTimeout) return
            if (!e.target.getAttribute('name')) return
            update()
        })

        const toggleFields = customCreateElement({
            className:'d-flex gap-3 align-items-center',
            parent,
        })

        if (id !== '') {
            const enableGroup = createFormCheck({
                parent: toggleFields,
                checked: style.active,
                formCheckClass: 'flex-grow-1',
                // labelInnerText: 'Enable group',
                role: 'switch',
                events: {
                    click: (e) => {
                        const value = e.target.checked
                        if (value === style.active) return
    
                        style.active = value
                        update()
                    }
                }
            })

            const rank = createBadgeSelect({
                parent: toggleFields,
                selectClass: `ms-auto border-0 p-0 pe-1 text-end text-bg-${getPreferredTheme()}`,
                attrs: {name: `${id}-rank`},
                options: (() => {
                    const options = {   }
                    
                    for (let i = 0; i < Object.keys(symbology.groups).length; i++) {
                        options[i+1] = i+1
                    }
                    
                    return options
                })(),
                currentValue: String(style.rank),
                events: {
                    change: (e) => {
                        let value = parseInt(e.target.value)
                        if (isNaN(value)) e.target.value = value = style.rank
                        if (value === style.rank) return
                        
                        style.rank = value
                        update()
                    }
                }
            })
        } else {
            const defaultLabel = createSpan('Default', {
                parent: toggleFields,
                className: 'fs-12 fw-medium text-muted user-select-none mb-2',
            })
        }

        const copyBtn = createIcon({
            className: `bi bi-copy ${id === '' ? 'ms-auto' : ''}`, 
            parent:toggleFields, 
            peNone:false,
            title: 'Copy group symbology',
            events: {
                click: (e) => {
                    const text = JSON.stringify(styleParams)
                    navigator.clipboard.writeText(text)
                }
            }
        })

        const pasteBtn = createIcon({
            className:'bi bi-clipboard', 
            parent:toggleFields, 
            peNone:false,
            title: 'Paste group symbology',
            events: {
                click: async (e) => {
                    const text = await navigator.clipboard.readText()
                    if (!text) return
    
                    try {
                        const newStyleParams = getLeafletStyleParams(JSON.parse(text))

                        if (!Object.keys(styleParams).every(i => {
                            return Object.keys(newStyleParams).includes(i)
                        })) throw new Error('Invalid style params')


                        style.styleParams = await updateSymbology({
                            ...newStyleParams,
                            fillPatternId: styleParams.fillPatternId
                        }, {refresh:style.active})

                        parent.parentElement.insertBefore(getSymbologyForm(id), parent)
                        parent.remove()               
                    } catch (error) {
                        console.log(error)
                    }  
                }
            }
        })

        if (id !== '') {
            const deleteBtn = createIcon({
                className:'bi bi-trash-fill text-danger', 
                parent:toggleFields, 
                peNone:false,
                title: 'Remove group',
                events: {
                    click: (e) => {
                        const menuContainer = contextMenuHandler(e, {
                            confirm: {
                                innerText: `Confirm to remove group`,
                                btnCallback: async () => {
                                    parent.remove()
                                    document.querySelector(`#${styleParams.fillPatternId}`)?.remove()
                                    delete symbology.groups[id]
                                    style.active = false
                                    update()
                                }
                            },            
                        })
                        menuContainer.classList.add('bg-danger')        
                    }
                }
            })
        }

        createIcon({
            className:'dropdown-toggle', 
            parent:toggleFields, 
            peNone:false,
            attrs: {
                'data-bs-toggle': 'collapse',
                'aria-expanded': style.rank === 1 ? 'true' : 'false',
                'data-bs-target': `#${collapseId}`,
                'aria-controls': collapseId,
            },
        })

        const headerFields = customCreateElement({
            className:'d-flex gap-2 align-items-center mb-2',
            style: {cursor:'pointer'},
            parent,
        })

        const label = createFormFloating({
            parent:headerFields,
            containerClass: 'w-100',
            fieldAttrs: {
                name: `${id}-label`,
                type: 'text',
                value: style.label
            },
            labelText: 'Label',
            fieldClass: 'form-control-sm',
            events: {
                blur: async (e) => {
                    const value = e.target.value.trim() 
                    if (value === style.label) return

                    style.label = value

                    const legendLabel = legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)
                    if (legendLabel) legendLabel.innerText = value

                    map._handlers.updateStoredLegendLayers({layer})
                }
            }
        })

        const groupChecks = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:headerFields
        })

        const toggleLabel = createFormCheck({
            parent:groupChecks,
            labelInnerText: 'Show label',
            checked: style.showLabel,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === style.showLabel) return

                    style.showLabel = value
                    legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)?.classList.toggle('d-none', !value)

                    map._handlers.updateStoredLegendLayers({layer})
                }
            }
        })

        const toggleCount = createFormCheck({
            parent:groupChecks,
            labelInnerText: 'Show count',
            checked: style.showCount,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === style.showCount) return

                    style.showCount = value
                    legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-count`)?.classList.toggle('d-none', !value)

                    map._handlers.updateStoredLegendLayers({layer})
                }
            }
        })

        const collapseDiv = customCreateElement({
            id: collapseId,
            className:`accordion-collapse collapse ${style.rank === 1 ? 'show' : ''} border-start border-3 ps-2`,
            attrs: {'data-bs-parent':`#${body.id}-methodDetails`},
            parent,
        })

        const fieldsContainer = customCreateElement({
            className:'d-flex flex-column gap-2',
            parent: collapseDiv,
        })

        const iconFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconType = createFormFloating({
            parent: iconFields,
            containerClass: 'w-25 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-iconType`},
            fieldClass: 'form-select-sm',
            labelText: 'Icon type',
            options: {
                'bi': 'bootstrap icon',
                'text': 'text',
                'emoji': 'emoji',
                'img': 'image url',
                'svg': 'svg element',
                'html': 'html element',
                'property': 'feature property',
            },
            currentValue: styleParams.iconType,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.iconType) return

                    const iconSpecs = parent.querySelector(`[name="${id}-iconSpecs"]`)
                    styleParams.iconSpecs = iconSpecs.value = value === 'bi' ? 'circle-fill' : ''

                    styleParams.iconType = value
                    updateIconDatalistOptions()
                    update()
                }
            }
        })

        const iconDatalist = customCreateElement({
            tag:'datalist', 
            parent:iconFields,
        })

        const updateIconDatalistOptions = async () => {
            iconDatalist.innerHTML = ''

            const iconType = styleParams.iconType

            if (iconType === 'bi') setBootstrapIconsAsOptions(iconDatalist)

            if (iconType === 'property') {
                const options = layer._properties.info.attributes
                const sortedOptions = [...(options.length ? new Set(options) : [])].sort()
                    
                for (const i of sortedOptions) {
                    const option = document.createElement('option')
                    option.value = i
                    iconDatalist.appendChild(option)
                }
            }
        }

        const iconSpecs = createFormFloating({
            parent: iconFields,
            containerClass: 'd-flex w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-iconSpecs`,
                type: 'search',
                value: styleParams.iconSpecs,
                list: (() => {
                    updateIconDatalistOptions()
                    return iconDatalist.id
                })()
            },
            fieldClass: 'form-control-sm',
            labelText: 'Icon',
            events: {
                change: (e) => {
                    let value = e.target.value.trim()
                    
                    if (!value && styleParams.iconType === 'bi') {
                        value = e.target.value = 'circle-fill'
                    }
                    
                    styleParams.iconSpecs = value
                    update()
                }
            }
        })

        const patternCheckboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1', 
            parent:iconFields
        })

        const iconFill = createFormCheck({
            parent:patternCheckboxes,
            labelInnerText: 'Icon fill',
            checked: styleParams.iconFill,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconFill) return

                    styleParams.iconFill = value
                    update()
                }
            }
        })

        const iconStroke = createFormCheck({
            parent:patternCheckboxes,
            labelInnerText: 'Icon stroke',
            checked: styleParams.iconStroke,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconStroke) return

                    styleParams.iconStroke = value
                    update()
                }
            }
        })

        const iconFields2 = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconSize = createInputGroup({
            parent:iconFields2,
            inputGroupClass: 'w-25 flex-grow-1',
            fieldAttrs: {
                name: `${id}-iconSize`,
                type: 'number',
                min: '1',
                max: '100',
                step: '1',
                value: styleParams.iconSize,
                placeholder: 'Icon size',
            },
            suffixHTML: 'px',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value)
                    if (!value || value === styleParams.iconSize) {
                        e.target.value = styleParams.iconSize
                        return
                    }

                    styleParams.iconSize = value
                    update()
                }
            }
        })

        const iconRotation = createInputGroup({
            parent:iconFields2,
            inputGroupClass: 'w-25 flex-grow-1',
            fieldAttrs: {
                name: `${id}-iconRotation`,
                type: 'number',
                min: '0',
                max: '359',
                step: '15',
                value: styleParams.iconRotation,
                placeholder: 'Icon rotation',
            },
            suffixHTML: '°',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value === styleParams.iconRotation) return
                    
                    styleParams.iconRotation = value
                    update()
                }
            }
        })

        const iconOffset = createInputGroup({
            parent:iconFields2,
            inputGroupClass: 'w-25 flex-grow-1',
            fieldAttrs: {
                name: `${id}-iconOffset`,
                type: 'text',
                value: styleParams.iconOffset ?? '0,0',
                placeholder: 'Icon offset (x,y)',
            },
            suffixHTML: 'px',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    let value = e.target.value
                    if (value === styleParams.iconOffset) return

                    const values = value.split(',')
                    if (values.length !== 2 || values.some(i => isNaN(i))) {
                        value = e.target.value = '0,0'
                    }

                    styleParams.iconOffset = value
                    update()
                }
            }
        })

        const iconFields3 = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const iconCheckboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:iconFields3
        })

        const iconShadow = createFormCheck({
            parent:iconCheckboxes,
            labelInnerText: 'Shadow effect',
            checked: styleParams.iconShadow,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconShadow) return

                    styleParams.iconShadow = value
                    update()
                }
            }
        })

        const iconGlow = createFormCheck({
            parent:iconCheckboxes,
            labelInnerText: 'Glow effect',
            checked: styleParams.iconGlow,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.iconGlow) return

                    styleParams.iconGlow = value
                    update()
                }
            }
        })
     
        const textCheckboxes = customCreateElement({
            className:'d-flex flex-column flex-wrap justify-content-center border px-2 rounded pt-1 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:iconFields3
        })

        const textWrap = createFormCheck({
            parent:textCheckboxes,
            formCheckClass:'me-3',
            labelInnerText: 'Text wrap',
            checked: styleParams.textWrap,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.textWrap) return

                    styleParams.textWrap = value
                    update()
                }
            }
        })
        
        const fontSerif = createFormCheck({
            parent:textCheckboxes,
            labelInnerText: 'Font serif',
            checked: styleParams.fontSerif,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.fontSerif) return

                    styleParams.fontSerif = value
                    update()
                }
            }
        })

        const boldFont = createFormCheck({
            parent:textCheckboxes,
            formCheckClass:'me-3',
            labelInnerText: 'Bold font',
            checked: styleParams.boldFont,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.boldFont) return

                    styleParams.boldFont = value
                    update()
                }
            }
        })

        const italicFont = createFormCheck({
            parent:textCheckboxes,
            labelInnerText: 'Italic font',
            checked: styleParams.italicFont,
            labelClass: 'text-nowrap',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.italicFont) return

                    styleParams.italicFont = value
                    update()
                }
            }
        })

        const textAlignment = createBadgeSelect({
            parent:textCheckboxes,
            selectClass: `border-0 text-start mb-1 w-25`,
            rounded: false,
            options: {
                'center': 'Text center',
                'start': 'Text left',
                'end': 'Text right',
            },
            currentValue: styleParams.textAlignment ?? 'center',
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.textAlignment) return

                    styleParams.textAlignment = value
                    update()
                }
            }
        })

        const justifytAlignment = createBadgeSelect({
            parent:textCheckboxes,
            selectClass: `border-0 text-start mb-1 w-25`,
            rounded: false,
            options: {
                'center': 'Justify center',
                'start': 'Justify left',
                'end': 'Justify right',
            },
            currentValue: styleParams.justifytAlignment ?? 'center',
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.justifytAlignment) return

                    styleParams.justifytAlignment = value
                    update()
                }
            }
        })

        const fillFields = customCreateElement({
            className:'d-flex gap-2 flex-wrap',
            parent: fieldsContainer,
        })

        const fillPattern = createFormFloating({
            parent: fillFields,
            containerClass: 'w-10 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-fillPattern`},
            fieldClass: 'form-select-sm',
            labelText: 'Fill pattern',
            options: {
                'solid': 'solid',
                'icon': 'icon',
                'none': 'none',
            },
            currentValue: styleParams.fillPattern,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.fillPattern) return

                    styleParams.fillPattern = value
                    update()
                }
            }
        })

        const fillColor = createFormFloating({
            parent:fillFields,
            containerClass: 'w-10 flex-grow-1',
            fieldAttrs: {
                name:`${id}-fillColor`,
                type: 'color',
                value: hslToHex(manageHSLAColor(styleParams.fillColor)),
            },
            fieldClass: 'form-control-sm',
            labelText: 'Fill color',
            events: {
                blur: (e) => {
                    const value = hexToHSLA(e.target.value)
                    if (value === styleParams.fillColor) return

                    styleParams.fillColor = value
                    update()
                }
            }
        })

        const fillOpacity = createInputGroup({
            parent:fillFields,
            fieldAttrs: {
                name: `${id}-fillOpacity`,
                type: 'number',
                min: '0',
                max: '100',
                step: '10',
                value: styleParams.fillOpacity * 100,
                placeholder: 'Fill opacity',
            },
            suffixHTML: '%',
            fieldClass: 'form-control-sm',
            inputGroupClass: 'w-25 flex-grow-1',
            events: {
                blur: (e) => {
                    const value = (parseFloat(e.target.value) / 100) || 0
                    if (value === styleParams.fillOpacity) return
                    
                    styleParams.fillOpacity = value
                    update()
                }
            }
        })

        const patternBgFields = customCreateElement({
            className:'border rounded p-2 d-flex justify-content-center align-items-center gap-1 w-25 flex-grow-1', 
            style: {maxHeight:'58px'},
            parent:fillFields
        })

        const patternBg = createFormCheck({
            parent: patternBgFields,
            labelInnerText: 'Pattern background',
            checked: styleParams.patternBg,
            labelClass: 'text-wrap text-start',
            formCheckClass: 'fs-10',
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === styleParams.patternBg) return

                    patternBgColor.disabled = !value

                    styleParams.patternBg = value
                    update()
                }
            }
        })

        const patternBgColor = (() => {
            const input = document.createElement('input')
            input.className = 'p-0'
            input.disabled = !styleParams.patternBg
            input.setAttribute('name',`${id}-patternBgColor`)
            input.setAttribute('type',`color`)
            input.value = hslToHex(manageHSLAColor(styleParams.patternBgColor))
            input.addEventListener('blur', (e) => {
                const value = hexToHSLA(e.target.value)
                if (value === styleParams.patternBgColor) return

                styleParams.patternBgColor = value
                update()
            })
            patternBgFields.appendChild(input)
            return input
        })()

        const strokeFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })
        
        const strokeColor = createFormFloating({
            parent:strokeFields,
            containerClass: 'w-100 flex-grow-1',
            fieldAttrs: {
                name:`${id}-strokeColor`,
                type: 'color',
                value: hslToHex(manageHSLAColor(styleParams.strokeColor)),
            },
            fieldClass: 'form-control-sm',
            labelText: 'Stroke color',
            events: {
                blur: (e) => {
                    const value = hexToHSLA(e.target.value)
                    if (value === styleParams.strokeColor) return

                    styleParams.strokeColor = value
                    update()
                }
            }
        })

        const strokeOpacity = createInputGroup({
            parent:strokeFields,
            fieldAttrs: {
                name: `${id}-strokeOpacity`,
                type: 'number',
                min: '0',
                max: '100',
                step: '10',
                value: styleParams.strokeOpacity * 100,
                placeholder: 'Stroke opacity',
            },
            suffixHTML: '%',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = (parseFloat(e.target.value) / 100) || 0
                    if (value === styleParams.strokeOpacity) return

                    styleParams.strokeOpacity = value
                    update()
                }
            }
        })

        const strokeWidth = createInputGroup({
            parent:strokeFields,
            fieldAttrs: {
                name: `${id}-strokeWidth`,
                type: 'number',
                min: '0',
                max: '10',
                step: '1',
                value: styleParams.strokeWidth,
                placeholder: 'Stroke width',
            },
            suffixHTML: 'px',
            fieldClass: 'form-control-sm',
            events: {
                blur: (e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value === styleParams.strokeWidth) return

                    styleParams.strokeWidth = value
                    update()
                }
            }
        })
        
        const lineFields = customCreateElement({
            className:'d-flex gap-2',
            parent: fieldsContainer,
        })

        const lineCap = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineCap`},
            fieldClass: 'form-select-sm',
            labelText: 'Line cap',
            options: {
                'round': 'round',
                'butt': 'butt',
                'square': 'square',
            },
            currentValue: styleParams.lineCap,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineCap) return

                    styleParams.lineCap = value
                    update()
                }
            }
        })

        const lineJoin = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineJoin`},
            fieldClass: 'form-select-sm',
            labelText: 'Line join',
            options: {
                'round': 'round',
                'arcs': 'arcs',
                'bevel': 'bevel',
                'miter': 'miter',
                'miter-clip': 'miter-clip',
            },
            currentValue: styleParams.lineJoin,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineJoin) return

                    styleParams.lineJoin = value
                    update()
                }
            }
        })

        const lineBreak = createFormFloating({
            parent: lineFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `${id}-lineBreak`},
            fieldClass: 'form-select-sm',
            labelText: 'Line break',
            options: {
                'solid': 'solid',
                'dashed': 'dashed',
                'dotted': 'dotted',
            },
            currentValue: styleParams.lineBreak,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === styleParams.lineBreak) return

                    const strokeWidth = styleParams.strokeWidth
                    styleParams.dashArray = value === 'solid' ? null : `${
                        value === 'dashed' 
                        ? (strokeWidth * 5) 
                        : (((Math.ceil(strokeWidth)) - 1) || 1)
                    } ${strokeWidth * 3}`

                    styleParams.lineBreak = value
                    update()
                }
            }
        })

        return parent
    }

    const updateSymbologyGroups = async () => {
        controller = resetController({controller, message: 'New symbology method update.'})
        const controllerId = controller.id

        const spinner = body.querySelector(`#${body.id}-symbologySpinner`)
        spinner.classList.remove('d-none')

        const symbology = layer._properties.symbology
        if (symbology.groups) {
            Object.values(symbology.groups).forEach(i => {
                document.querySelector(`svg#svgFillDefs defs#${i.styleParams.fillPatternId}`)?.remove()
            })
            delete symbology.groups
        }

        const container = body.querySelector(`#${body.id}-methodDetails`)
        container.innerHTML = ''

        if (symbology.method !== 'single' && symbology.groupBy?.length) {
            const geojson = (await getLeafletGeoJSONData(layer, {
                controller,
                filter: true,
            })) ?? layer.toGeoJSON()
            
            if (controllerId !== controller.id) return

            if (geojson && (symbology.method === 'categorized')) {
                let groups = []
                geojson?.features?.forEach(feature => {
                    const values = Object.fromEntries(symbology.groupBy.map(i => [i, ((e) => {
                        if (i === '[geometry_type]') return feature.geometry.type
                        
                        let value = removeWhitespace(String(feature.properties[i] ?? '[undefined]'))
                        if (symbology.case === false) value = value.toLowerCase()
                        return value === '' ? '[blank]' : value
                    })()]))
    
                    groups.push(JSON.stringify(values))
                })

                if (controllerId !== controller.id) return

                const groupsSetSorted = (groups.length ? [...new Set(groups)] : []).sort((a, b) => {
                    const countOccurrences = (item, search) => item.split(search).length-1
                    const aCount = countOccurrences(a, '[undefined]') + countOccurrences(a, '[blank]')
                    const bCount = countOccurrences(b, '[undefined]') + countOccurrences(b, '[blank]')
                    return aCount !== bCount ? aCount - bCount : (a.localeCompare(b))
                })

                const count = groupsSetSorted.length
                if (count) {
                    symbology.default.rank = count + 1
                    symbology.groups = {}
                    
                    let rank = 0
                    for (const group of groupsSetSorted) {
                        if (controllerId !== controller.id) return

                        rank +=1
                        const filters = JSON.parse(group)

                        const styleParams = await updateSymbology(getLeafletStyleParams({
                            ...symbology.default.styleParams,
                            fillColor: removeWhitespace(`hsla(
                                ${Math.round(Math.random()*(
                                    ((360/count*rank)-(360/count*0.75))-(360/count*(rank-1))
                                ))+(360/count*(rank-1))},
                                ${Math.round(Math.random()*(100-75))+75}%,
                                ${Math.round(Math.random()*(55-45))+45}%,
                            1)`),
                            fillOpacity: 0.5,
                            strokeColor: true,
                            strokeOpacity: 1,
                            patternBgColor: null,
                            fillPatternId: null,
                        }), {refresh:false, updateLocalStorage:false})
    
                        if (controllerId !== controller.id) return
                        if (!symbology.groups) return
                        
                        symbology.groups[generateRandomString()] = {
                            active: true,
                            label: Object.values(filters).join(', '),
                            showCount: true,
                            showLabel: true,
                            rank,
                            styleParams,
                            filters: {
                                type: (() => {
                                    const value = {active: false, values: {
                                        Point: true,
                                        MultiPoint: true,
                                        LineString: true,
                                        MultiLineString: true,
                                        Polygon: true,
                                        MultiPolygon: true,
                                    }}
    
                                    if (Object.keys(filters).includes('[geometry_type]')) {
                                        value.active = true
                                        Object.keys(value.values).forEach(i => {
                                            value.values[i] = i === filters['[geometry_type]']
                                        })
                                    }
                                    
                                    return value
                                })(),
                                properties: (() => {
                                    const value = {active: false, values: {}, operator: '&&'}
    
                                    const propertyFilters = Object.keys(filters).filter(i => i !== '[geometry_type]')
                                    if (propertyFilters.length) {
                                        value.active = true
                                        propertyFilters.forEach(i => {
                                            value.values[generateRandomString()] = {
                                                active: true,
                                                property: i,
                                                handler: 'equals',
                                                value: true,
                                                case: symbology.case,
                                                values: [filters[i]]
                                            }
                                        })
                                    }
                                    
                                    return value
                                })(),
                                geom: {active: false, values: {}, operator: '&&'},
                            },
                        }
                    }
                }
            }
            
            if (geojson && (symbology.method === 'graduated')) {
                const property = symbology.groupBy[0]
                const validFeatures = geojson.features.filter(i => !isNaN(parseFloat(i.properties[property] ?? '')))
                if (validFeatures.length) {
                    if (controllerId !== controller.id) return
                    
                    const values = validFeatures.map(i => parseFloat(i.properties[property] ?? ''))
                    const min = Math.min(...values)
                    const max = Math.max(...values)
                    const diff = max - min
                    const groupCount = symbology.groupCount = form.elements.groupCount.value = diff === 0 ? 1 : symbology.groupCount || 5
                    const interval = diff === 0 ? 0 : diff/(groupCount-1)
                    const precision = symbology.groupPrecision = form.elements.groupPrecision.value = diff === 0 
                    ? 1 : symbology.groupPrecision || Number(`1${'0'.repeat(Math.floor((String(interval).length)/2))}`)

                    const groups = []
                    let currentMin = min
                    while (currentMin < max || !groups.length) {
                        if (controllerId !== controller.id) break

                        const currentMax = Math.round((currentMin + interval)/precision) * precision

                        groups.push({
                            min: currentMin,
                            max: currentMax > max ? max : currentMax
                        })
                        currentMin = currentMax
                    }

                    if (controllerId !== controller.id) return

                    const count = groups.length
                    if (count) {
                        symbology.default.rank = groups.length + 1
                        if (groups.length) {
                            const hslaColor = manageHSLAColor(generateRandomColor())

                            symbology.groups = {}
                            
                            let rank = 0
                            for (const filters of groups) {
                                if (controllerId !== controller.id) return

                                rank +=1
                                
                                const styleParams = await updateSymbology(getLeafletStyleParams({
                                    ...symbology.default.styleParams,
                                    fillColor: hslaColor.toString({l:20+(((80-20)/(groups.length-1 || 1))*(rank-1))}),
                                    fillOpacity: 0.5,
                                    strokeColor: true,
                                    strokeOpacity: 1,
                                    patternBgColor: null,
                                    fillPatternId: null,
                                    iconStroke: false,
                                    iconSize: 10 + (((50-10)/(groups.length-1 || 1))*(rank-1)),
                                    strokeWidth: 1 + (((5-1)/(groups.length-1 || 1))*(rank-1))
                                }), {refresh:false, updateLocalStorage:false})

                                if (controllerId !== controller.id) return
                                if (!symbology.groups) return
            
                                symbology.groups[generateRandomString()] = {
                                    active: true,
                                    label: `${formatNumberWithCommas(filters.min)} - ${formatNumberWithCommas(filters.max)}`,
                                    showCount: true,
                                    showLabel: true,
                                    rank,
                                    styleParams,
                                    filters: {
                                        type: {active: false, values: {
                                            Point: true,
                                            MultiPoint: true,
                                            LineString: true,
                                            MultiLineString: true,
                                            Polygon: true,
                                            MultiPolygon: true,
                                        }},
                                        properties: (() => {
                                            const value = {active: true, values: {}, operator: '&&'}
            
                                            value.values[generateRandomString()] = {
                                                active: true,
                                                property,
                                                handler: 'greaterThanEqualTo',
                                                value: true,
                                                case: true,
                                                values: [filters.min]
                                            }
            
                                            value.values[generateRandomString()] = {
                                                active: true,
                                                property,
                                                handler: 'lessThanEqualTo',
                                                value: true,
                                                case: true,
                                                values: [filters.max]
                                            }
                                            
                                            return value
                                        })(),
                                        geom: {active: false, values: {}, operator: '&&'},
                                    },
                                }
                            }
                        }
                    }
                }
            }
        }

        Array(...Object.keys(symbology.groups ?? {}), '').forEach(i => {
            if (controllerId !== controller.id) return
            container.appendChild(getSymbologyForm(i))
        })

        spinner.classList.add('d-none')

        if (controllerId !== controller.id) return
        updateLeafletGeoJSONLayer(layer, {
            geojson: layer.toGeoJSON(),
            controller,
        })
    }

    const getGeomFilterForm = (id) => {
        const filters = layer._properties.filters
        const filter = filters.geom.values[id]

        const parent = customCreateElement({className:'d-flex gap-2 flex-column'})

        const paramsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const enable = createFormCheck({
            parent: paramsFields,
            checked: filter.active,
            name: `geomFilter-enable-${id}`,
            disabled: !filters.geom.active,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.active) return

                    filter.active = value
                    if (filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const handler = createFormFloating({
            parent: paramsFields,
            containerClass:'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {
                name: `geomFilter-handler-${id}`,
            },
            fieldClass: 'form-select-sm',
            labelText: 'Relation',
            labelClass: 'text-nowrap',
            disabled: !filters.geom.active,
            options: {
                'booleanIntersects': 'intersects',
                'booleanEqual': 'equals',
                'booleanTouches': 'touches',
                'booleanWithin': 'within',
                'booleanContains': 'contains',
            },
            currentValue: filter.handler,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === filter.handler) return

                    filter.handler = value
                    if (filter.active && filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const checkboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',
            style: {height: '58px'},
            parent:paramsFields
        })

        const value = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Relation is true',
            checked: filter.value,
            labelClass: 'text-nowrap',
            disabled: !filters.geom.active,
            name: `geomFilter-value-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.value) return

                    filter.value = value
                    if (filter.active && filter.geoms?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const geomsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const btnsContainer = customCreateElement({
            parent:geomsFields,
            className:'d-flex flex-column justify-content-center pt-1 me-1', 
        })

        const zoominBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi bi-zoom-in',
            disabled: !filters.geom.active,
            name: `geomFilter-zoomin-${id}`,
            events: {
                click: (e) => {
                    if (!filter.geoms?.length) return
                    zoomToLeafletLayer(L.geoJSON(turf.featureCollection(filter.geoms.map(i => turf.feature(i)))), map)
                }
            }
        })

        const legendBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi-plus-lg',
            disabled: !filters.geom.active,
            name: `geomFilter-legend-${id}`,
            events: {
                click: async (e) => {
                    if (!filter.geoms?.length) return

                    const geojson = turf.featureCollection(filter.geoms.map(i => turf.feature(i)))

                    const addLayers = await getLeafletGeoJSONLayer({
                        geojson,
                        params: {name: 'geometry filter'},
                        pane: createCustomPane(map),
                        group: map._handlers.getLayerGroups().local,
                        customStyleParams: {
                            fillOpacity: 0,
                            strokeWidth: 3,
                            strokeColor: generateRandomColor()
                        },
                    })

                    if (addLayers) addLayers._group.addLayer(addLayers)
                }
            }
        })

        const removeBtn = createButton({
            parent: btnsContainer,
            className: 'fs-12 bg-transparent border-0 p-0',
            iconSpecs: 'bi bi-trash-fill',
            disabled: !filters.geom.active,
            name: `geomFilter-remove-${id}`,
            events: {
                click: (e) => {
                    parent.remove()
                    const update = filter.active && filter.geoms?.length
                    delete filters.geom.values[id]
                    if (update) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const geom = createFormFloating({
            parent: geomsFields,
            containerClass: 'flex-grow-1',
            fieldAttrs: {name: `geomFilter-geom-${id}`},
            fieldTag: 'textarea',
            fieldClass: 'fs-12',
            fieldStyle: {minHeight:'100px'},
            currentValue: (filter.geoms ?? []).map(i => JSON.stringify(i)).join(','),
            labelText: 'Comma-delimited geometries',
            disabled: !filters.geom.active,
            events: {
                blur: (e) => {
                    e.target.classList.remove('is-invalid')

                    let value
                    try {
                        value = e.target.value.trim()
                        if (!value.startsWith('[')) value = `[${value}`
                        if (!value.endsWith(']')) value = `${value}]`

                        value = JSON.parse(value)

                        if (!value.every(i => turf.booleanValid(i))) throw new Error('Invalid goemetry')
                        
                        value = value.map(i => {
                            return simplifyFeature(i, {
                                maxPts: 100,
                                highQuality: true,
                            }).geometry
                        }).filter(i => i)

                        e.target.value = value.map(i => JSON.stringify(i)).join(',')
                    } catch (error) {
                        console.log(error)
                        e.target.classList.add('is-invalid')
                        value = null
                    }
                    
                    if (!value && !filter.geoms?.length) return
                    if (value && filter.geoms && filter.geoms.length 
                        && value.every(i => filter.geoms.find(g => turf.booleanEqual(i, g)))
                        && filter.geoms.every(i => value.find(g => turf.booleanEqual(i, g)))
                    ) return
                    
                    filter.geoms = value
                    if (filter.active) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        return parent
    }

    const getPropertyFilterForm = (id) => {
        const filters = layer._properties.filters
        const filter = filters.properties.values[id]
        
        const parent = customCreateElement({className:'d-flex gap-2 flex-column'})
        
        const paramsFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const enable = createFormCheck({
            parent: paramsFields,
            checked: filter.active,
            name: `propFilter-enable-${id}`,
            disabled: !filters.properties.active,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.active) return

                    filter.active = value
                    if (filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const property = createFormFloating({
            parent: paramsFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `propFilter-property-${id}`},
            fieldClass: 'form-select-sm',
            labelText: 'Property',
            disabled: !filters.properties.active,
            options: {[filter.property || '']:filter.property || ''},
            currentValue: filter.property || '',
            events: {
                focus: async (e) => {
                    const field = e.target
                    field.innerHTML = ''
                    
                    const options = layer._properties.info.attributes
                    const optionsSet = options.length ? new Set(options) : []
                    const sortedOptions = [...optionsSet].sort()

                    for (const i of sortedOptions) {
                        const option = document.createElement('option')
                        option.value = i
                        option.text = i
                        if (i === field.property) option.setAttribute('selected', true)
                        field.appendChild(option)
                    }
                },
                blur: (e) => {
                    const value = e.target.value
                    if (value === filter.property) return

                    filter.property = value
                    if (filter.active && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const handler = createFormFloating({
            parent: paramsFields,
            containerClass: 'w-100 flex-grow-1',
            fieldTag: 'select',
            fieldAttrs: {name: `propFilter-handler-${id}`},
            fieldClass: 'form-select-sm',
            labelText: 'Relation',
            disabled: !filters.properties.active,
            options: {
                'equals': 'equals',
                'contains': 'contains',
                'greaterThan': 'greater than',
                'greaterThanEqualTo': 'greater than or equal to',
                'lessThan': 'less than',
                'lessThanEqualTo': 'less than or equal to',
            },
            currentValue: filter.handler,
            events: {
                change: (e) => {
                    const value = e.target.value
                    if (value === filter.handler) return

                    filter.handler = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const checkboxes = customCreateElement({
            className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',
            style: {height: '58px'},
            parent:paramsFields
        })

        const value = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Relation is true',
            checked: filter.value,
            labelClass: 'text-nowrap',
            disabled: !filters.properties.active,
            name: `propFilter-value-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.value) return

                    filter.value = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const caseSensitive = createFormCheck({
            parent:checkboxes,
            labelInnerText: 'Case-sensitive',
            checked: filter.case,
            labelClass: 'text-nowrap',
            disabled: !filters.properties.active,
            name: `propFilter-case-${id}`,
            events: {
                click: (e) => {
                    const value = e.target.checked
                    if (value === filter.case) return

                    filter.case = value
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })


        const valueFields = customCreateElement({
            className:'d-flex gap-2 flex-grow-1 align-items-center',
            parent,
        })

        const removeBtn = createButton({
            parent: valueFields,
            className: 'fs-12 bg-transparent border-0 p-0 me-1',
            iconSpecs: 'bi bi-trash-fill',
            disabled: !filters.properties.active,
            name: `propFilter-remove-${id}`,
            events: {
                click: (e) => {
                    parent.remove()
                    delete filters.properties.values[id]
                    if (filter.active && filter.property && filter.values?.length) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }
            }
        })

        const values = createTagifyField({
            parent: valueFields,
            inputClass: `w-100 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1`,
            inputTag: 'textarea',
            delimiters: null,
            enabled: 0,
            disabled: !filters.properties.active,
            dropdownClass:  `my-1 border-0`,
            userInput: true,
            scopeStyle: {
                minHeight: '58px',
            },
            name:  `propFilter-values-${id}`,
            placeholder: 'Select property values',
            currentValue: JSON.stringify((filter.values || []).map(i => {return {value:i}})),
            events: {
                focus: async (e) => {
                    const tagify = Tagify(form.elements[`propFilter-values-${id}`])
                    
                    const options = []
    
                    if (Array('equals').includes(filter.handler) && filter.property) {
                        const geojson = (await getLeafletGeoJSONData(layer, {
                            controller,
                            filter:false,
                        })) ?? layer.toGeoJSON()
                        turf.propEach(geojson, (currentProperties, featureIndex) => {
                            let value = removeWhitespace(String(currentProperties[filter.property] ?? '[undefined]'))
                            value = value === '' ? '[blank]' : value

                            if (!filter.values.includes(value)) options.push(String(value))
                        })
                    }
                    
                    const optionsSet = options.length ? new Set(options) : []
                    const sortedOptions = [...optionsSet].sort()
    
                    tagify.settings.whitelist = sortedOptions
                },
            },
            callbacks: {
                ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                    const tagify = e.detail.tagify
                    const values = tagify.value.map(i => i.value)
        
                    if (values.every(i => filter.values.includes(i))
                        && filter.values.every(i => values.includes(i))
                    ) return
        
                    filter.values = values
                    if (filter.active && filter.property) updateLeafletGeoJSONLayer(layer, {
                        controller,
                    })
                }])))() //, 'add', 'remove', 'edit'
            }
        })

        return parent
    }

    select.addEventListener('focus', (e) => {
        leafletMapLegendLayersToSelectOptions(map, select, {layer})
    })

    select.addEventListener('change', () => {
        const addLayersId = parseInt(select.value)

        body.innerHTML = ''
        layer = map._handlers.getLegendLayer(addLayersId)
        if (!layer) {
            body.removeAttribute('data-layer-id')
            body.classList.add('d-none')
            return
        }

        body.setAttribute('data-layer-id', addLayersId)
        body.classList.remove('d-none')

        const layerLegend = getLayerLegend()
        const layerStyles = layer._properties
        const symbology = layerStyles.symbology 
        const visibility = layerStyles.visibility
        const filters = layerStyles.filters
        const transformations = layerStyles.transformations
        const info = layerStyles.info
        const limits = layerStyles.limits
        const filterContainerId = generateRandomString()

        const styleFields = {
            'Legend': {
                'Identification': {
                    fields: {
                        title: {
                            handler: createFormFloating,
                            containerClass: 'w-25 flex-grow-1',
                            fieldAttrs: {
                                type: 'text',
                                value: layer._params.title,
                            },
                            fieldClass: 'form-control-sm',
                            labelText: 'Title',
                            events: {
                                change: (e) => {
                                    const field = e.target
                                    layer._params.title = field.value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-title`)?.querySelector('span')
                                    if (element) element.innerText = field.value

                                    select.options[select.selectedIndex].text = field.value

                                    map._handlers.updateStoredLegendLayers({layer})
                                }
                            }
                        },
                        idChecks: {
                            handler: ({parent}={}) => {
                                const container = customCreateElement({
                                    parent,
                                    className: 'd-flex flex-column justify-content-center w-10 flex-grow-1 border rounded px-3 pt-1',
                                    style: {height:'58px'}
                                })

                                const layerLegend = getLayerLegend()
                                const attribution = layerLegend.querySelector(`#${layerLegend.id}-attribution`)

                                container.appendChild(createFormCheck({
                                    checked: layer?._properties?.info?.showLegend !== false,
                                    labelInnerText: 'Show legend',
                                    labelClass: 'text-nowrap',
                                    role: 'checkbox',
                                    name: 'showLegend',
                                    events: {
                                        click: (e) => {
                                            const layers = layerLegend.parentElement
                                            layerLegend.classList.toggle('d-none')
                            
                                            layers.classList.toggle(
                                                'd-none', 
                                                Array.from(layers?.querySelectorAll('[data-layer-legend="true"]'))
                                                .every(el => el.classList.contains('d-none'))
                                            )                    

                                            layer._properties.info.showLegend = e.target.checked
                                            map._handlers.updateStoredLegendLayers({layer})
                                        }
                                    }
                                }))

                                container.appendChild(createFormCheck({
                                    checked: layer?._properties?.info?.showAttribution !== false,
                                    labelInnerText: 'Show attribution',
                                    labelClass: 'text-nowrap',
                                    role: 'checkbox',
                                    name: 'showAttr',
                                    events: {
                                        click: (e) => {
                                            attribution.classList.toggle('d-none')
                                            layer._properties.info.showAttribution = e.target.checked
                                            map._handlers.updateStoredLegendLayers({layer})
                                        }
                                    }
                                }))
                            }
                        },
                        attribution: {
                            handler: createFormFloating,
                            containerClass: 'w-100 flex-grow-1',
                            fieldTag: 'textarea',
                            currentValue: layer._params.attribution,
                            labelText: 'Attribution (HTML-frieldly)',
                            fieldClass: 'fs-12',
                            fieldStyle: {
                                minHeight: '100px', 
                            },
                            events: {
                                change: (e) => {
                                    const field = e.target

                                    const div = document.createElement('div')
                                    div.innerHTML = field.value
                                    Array.from(div.querySelectorAll('a')).forEach(a => {
                                        a.setAttribute('target', '_blank')
                                        
                                        const href = a.getAttribute('href')
                                        if (!href.startsWith('http')) a.setAttribute('href', `https://${href}`)
                                        
                                    })
                                    const value = div.innerHTML

                                    layer._params.attribution = value
                                    
                                    const element = layerLegend.querySelector(`#${layerLegend.id}-attribution`)
                                    element.innerHTML = value

                                    map._handlers.updateStoredLegendLayers({layer})
                                }
                            }
                        },
                    },
                    className: 'gap-2 flex-wrap'
                },
                ...(layer instanceof L.GeoJSON ? {
                    'Symbology': {
                        fields: {   
                            method: {
                                handler: createFormFloating,
                                containerClass: 'w-25',
                                fieldAttrs: {
                                    name:'method',
                                },
                                fieldTag:'select',
                                labelText: 'Method',
                                options:{
                                    'single':'Single',
                                    'categorized':'Categorized',
                                    'graduated':'Graduated',
                                    // 'rule':'Rule-based',
                                },
                                currentValue: symbology.method,
                                fieldClass:'form-select-sm',
                                events: {
                                    change: (e) => {
                                        const field = e.target
                                        const value = field.value
                                        symbology.method = value
                                        
                                        const tagifyObj = Tagify(form.elements.groupBy)
                                        const tagifyElement = tagifyObj.DOM.scope
                                        if (value === 'single') {
                                            tagifyElement.setAttribute('disabled', true)
                                        } else {
                                            const maxTags = value === 'categorized' ? 5 : 1
                                            tagifyObj.settings.maxTags = maxTags

                                            if (tagifyObj.value.length > maxTags) tagifyObj.removeAllTags()

                                            tagifyElement.removeAttribute('disabled')
                                        }

                                        body.querySelector(`#${body.id}-graduatedParams`).classList.toggle('d-none', value !== 'graduated')
                                        body.querySelector(`#${body.id}-categoryParams`).classList.toggle('d-none', value !== 'categorized')

                                        if (value === 'single' || symbology.groupBy?.length) updateSymbologyGroups()
                                    }
                                }
                            },
                            groupBy: {
                                handler: createTagifyField,
                                inputClass: `w-25 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                                inputTag: 'textarea',
                                enabled: 0,
                                disabled: symbology.method === 'single',
                                dropdownClass:  `my-1 border-0`,
                                userInput: true,
                                maxTags: symbology.method === 'categorized' ? 5 : 1,
                                scopeStyle: {
                                    height: '58px',
                                },
                                name:  `groupBy`,
                                placeholder: 'Select properties',
                                currentValue: JSON.stringify((symbology.groupBy || []).map(i => {return {value:i}})),
                                events: {
                                    focus: async (e) => {
                                        const tagify = Tagify(form.elements['groupBy'])
                                        
                                        const options = layer._properties.info.attributes
                                        if (symbology.method === 'categorized') {
                                            options.push('[geometry_type]')
                                        }

                                        const optionsSet = options.length ? new Set(options) : []
                                        const sortedOptions = [...optionsSet].filter(i => {
                                            return !(symbology.groupBy ?? []).includes(i)
                                        }).sort()
                                        tagify.settings.whitelist = sortedOptions
                                    },
                                },
                                callbacks: {
                                    ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                        const tagify = e.detail.tagify
                                        const values = tagify.value.map(i => i.value)
                            
                                        if (values.every(i => symbology.groupBy.includes(i)) && symbology.groupBy.every(i => values.includes(i)) ) return
                            
                                        symbology.groupBy = values
                                        updateSymbologyGroups()
                                    }])))() // , 'add', 'remove', 'edit'
                                }
                            },
                            categoryParams: {
                                handler: ({parent}={}) => {
                                    const div = customCreateElement({
                                        parent,
                                        id: `${body.id}-categoryParams`,
                                        style: {width:'20%', height:'58px'},
                                        className: `d-flex flex-column justify-content-center gap-1 w-25 border rounded px-3 py-1 ${symbology.method !== 'categorized' ? 'd-none' : ''}`
                                    })

                                    div.appendChild(createFormCheck({
                                        checked: symbology.case,
                                        formCheckClass: 'w-100',
                                        labelInnerText: 'Case-sensitive',
                                        events: {
                                            click: (e) => {
                                                const value = e.target.checked
                                                if (value === symbology.case) return
                                                
                                                symbology.case = value
                                                updateSymbologyGroups()
                                            }
                                        }
                                    }))
                                }
                            },
                            graduatedParams: {
                                handler: ({parent}={}) => {
                                    const div = customCreateElement({
                                        parent,
                                        id: `${body.id}-graduatedParams`,
                                        style: {width:'20%', height:'58px'},
                                        className: `d-flex flex-column justify-content-between gap-1 w-25 ${symbology.method !== 'graduated' ? 'd-none' : ''}`
                                    })

                                    div.appendChild(createFormFloating({
                                        fieldAttrs: {
                                            name:'groupCount',
                                            type:'number',
                                            value: symbology.groupCount ?? '',
                                            placeholder: 'No. of groups',
                                        },
                                        fieldClass: `py-1 px-2 fs-10`,
                                        events: {
                                            'blur': (e) => {
                                                const value = parseInt(e.target.value)
                                                if (value === symbology.groupCount) return
                                                
                                                symbology.groupCount = value
                                                updateSymbologyGroups()
                                            },
                                        }
                                    }).firstChild)
                                    
                                    div.appendChild(createFormFloating({
                                        fieldAttrs: {
                                            name:'groupPrecision',
                                            type:'number',
                                            value: symbology.groupPrecision ?? '',
                                            placeholder: 'Precision',
                                        },
                                        fieldClass: `py-1 px-2 fs-10`,
                                        events: {
                                            'blur': (e) => {
                                                const value = parseInt(e.target.value)
                                                if (value === symbology.groupPrecision) return

                                                symbology.groupPrecision = value
                                                updateSymbologyGroups()
                                            },
                                        }
                                    }).firstChild)
                                }
                            },
                            spinner: {
                                handler: ({parent}={}) => {
                                    const div = customCreateElement({
                                        id: `${body.id}-symbologySpinner`, 
                                        className:'spinner-border spinner-border-sm d-none mx-2', 
                                        attrs: {role:'status'}
                                    })
                                    parent.appendChild(div)
                                },
                            },
                            collapse: {
                                handler: createIcon,
                                className:'dropdown-toggle ms-auto', 
                                peNone: false,
                                attrs: {
                                    'data-bs-toggle': 'collapse',
                                    'aria-expanded': 'true',
                                    'data-bs-target': `#${body.id}-methodDetails-collapse`,
                                    'aria-controls': `${body.id}-methodDetails-collapse`,
                                },
                                style: {cursor:'pointer'},
                                events: {
                                    click: (e) => {
                                        const collapse = document.querySelector(e.target.getAttribute('data-bs-target'))
                                        if (collapse.classList.contains('show')) return
                                        Array.from(collapse.querySelectorAll('.collapse')).forEach(i => {
                                            bootstrap.Collapse.getOrCreateInstance(i).hide()
                                        })
                                    }
                                }
                            },
                            methodDetails: {
                                handler: ({parent}={}) => {
                                    const collapse = customCreateElement({
                                        id:`${body.id}-methodDetails-collapse`,
                                        className:'collapse show w-100',
                                        parent,
                                    })

                                    const container = customCreateElement({
                                        id:`${body.id}-methodDetails`,
                                        className:'w-100 d-flex flex-column accordion gap-3',
                                        parent:collapse,
                                    })
                                    
                                    if (symbology.method === 'single') {
                                        container.appendChild(getSymbologyForm(''))
                                    } else {
                                        const groupIds = Object.entries(symbology.groups || {}).sort(([keyA, valueA], [keyB, valueB]) => {
                                            return valueA.rank - valueB.rank
                                        }).map(i => i[0])

                                        Array(...groupIds, '').forEach(i => {
                                            container.appendChild(getSymbologyForm(i))
                                        })
                                    }
                                }
                            }
                        },
                        className: 'gap-2 flex-wrap'
                    },
                } : {})
            },
            'Rendering': {
                'Visibility': {
                    fields: {
                        enableScale: {
                            handler: createFormCheck,
                            checked: visibility.active,
                            formCheckClass: 'w-100',
                            labelInnerText: 'Enable scale-dependent rendering',
                            role: 'switch',
                            events: {
                                click: (e) => {
                                    const value = e.target.checked
                                    if (value === visibility.active) return
                
                                    form.elements.minScale.disabled = !value
                                    form.elements.maxScale.disabled = !value

                                    visibility.active = value
                                    leafletLayerIsVisible(layer, {updateLocalStorage:true})
                                }
                            }
                        },
                        minScale: {
                            handler: createInputGroup,
                            fieldAttrs: {
                                name:'minScale',
                                type:'number',
                                min: '10',
                                max: visibility.max,
                                step: '10',
                                value: visibility.min,
                                placeholder: 'Maximum',
                            },
                            prefixHTML: '1:',
                            suffixHTML: 'm',
                            fieldClass: 'form-control-sm',
                            disabled: !visibility.active,
                            inputGroupClass: 'w-25 flex-grow-1',
                            events: {
                                'change': (e) => {
                                    const field = e.target
                                    const maxScaleField = form.elements.maxScale
                                    
                                    if (!field.value) {
                                        field.value = 10
                                    } else {
                                        const maxScaleValue = parseInt(maxScaleField.value)
                                        if (maxScaleValue < parseInt(field.value)) field.value = maxScaleValue
                                    }
    
                                    visibility.min = parseInt(field.value)
                                    maxScaleField.setAttribute('min', field.value)
    
                                    leafletLayerIsVisible(layer, {updateLocalStorage:true})
                                },
                                'click': visibilityFieldsClick,
                            }
                        },
                        maxScale: {
                            handler: createInputGroup,
                            fieldAttrs: {
                                name:'maxScale',
                                type:'number',
                                min: visibility.min,
                                max: '5000000',
                                step: '10',
                                value: visibility.max,
                                placeholder: 'Minimum',
                            },
                            prefixHTML: '1:',
                            suffixHTML: 'm',
                            fieldClass: 'form-control-sm',
                            disabled: !visibility.active,
                            inputGroupClass: 'w-25 flex-grow-1',
                            events: {
                                'change': (e) => {
                                    const field = e.target
                                    const minScaleField = form.elements.minScale
                                    
                                    if (!field.value) {
                                        field.value = 5000000
                                    } else {
                                        const minScaleValue = parseInt(minScaleField.value)
                                        if (minScaleValue > parseInt(field.value)) field.value = minScaleValue
                                    }
                                    
                                    visibility.max = parseInt(field.value)
                                    minScaleField.setAttribute('max', field.value)
                                    
                                    leafletLayerIsVisible(layer, {updateLocalStorage:true})
                                },
                                'click': visibilityFieldsClick,
                            }
                        },
                    },
                    className: 'flex-wrap gap-2'
                },
                ...(layer instanceof L.GeoJSON ? {
                    'Feature Interactivity': {
                        fields: {
                            enableTooltip: {
                                handler: createFormCheck,
                                checked: info.tooltip.active,
                                formCheckClass: 'w-100 flex-grow-1 mt-2',
                                labelInnerText: 'Tooltip',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === info.tooltip.active) return
                    
                                        info.tooltip.active = value
                                        updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            tooltipProps: {
                                handler: createTagifyField,
                                inputClass: `w-50 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                                inputTag: 'textarea',
                                enabled: 0,
                                dropdownClass: `my-1 border-0`,
                                userInput: true,
                                maxTags: 5,
                                scopeStyle: {
                                    height: '58px',
                                },
                                name:  `tooltipProps`,
                                placeholder: 'Select properties',
                                currentValue: JSON.stringify((info.tooltip.properties || []).map(i => {return {value:i}})),
                                events: {
                                    focus: async (e) => {
                                        const tagify = Tagify(form.elements['tooltipProps'])
                                        
                                        const options = layer._properties.info.attributes
                                        const optionsSet = options.length ? new Set(options) : []
                                        const sortedOptions = [...optionsSet].filter(i => {
                                            return !(info.tooltip.properties || []).includes(i)
                                        }).sort()
                                        tagify.settings.whitelist = sortedOptions
                                    },
                                },
                                callbacks: {
                                    ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                        const tagify = e.detail.tagify
                                        const values = tagify.value.map(i => i.value)
                            
                                        if (values.every(i => info.tooltip.properties.includes(i)) && info.tooltip.properties.every(i => values.includes(i)) ) return
                            
                                        info.tooltip.properties = values
                                        if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                            geojson: layer.toGeoJSON(),
                                            controller,
                                        })
                                    }])))()
                                }
                            },
                            tooltipDel: {
                                handler: createFormFloating,
                                containerClass: 'w-10 flex-grow-1',
                                fieldAttrs: {
                                    type: 'text',
                                    value: info.tooltip.delimiter,
                                },
                                fieldClass: 'form-control-sm',
                                labelText: 'Delimiter',
                                labelClass: 'text-wrap',
                                events: {
                                    change: (e) => {
                                        const value = e.target.value
                                        if (value === info.tooltip.delimiter) return
                    
                                        info.tooltip.delimiter = value
                                        if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                            geojson: layer.toGeoJSON(),
                                            controller,
                                        })
                                    }
                                }
                            },
                            tooltipPrefix: {
                                handler: createFormFloating,
                                containerClass: 'w-10 flex-grow-1',
                                fieldAttrs: {
                                    type: 'text',
                                    value: info.tooltip.prefix,
                                },
                                fieldClass: 'form-control-sm',
                                labelText: 'Prefix',
                                labelClass: 'text-wrap',
                                events: {
                                    change: (e) => {
                                        const value = e.target.value
                                        if (value === info.tooltip.prefix) return
                    
                                        info.tooltip.prefix = value
                                        if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                            geojson: layer.toGeoJSON(),
                                            controller,
                                        })
                                    }
                                }
                            },
                            tooltipSuffix: {
                                handler: createFormFloating,
                                containerClass: 'w-10 flex-grow-1',
                                fieldAttrs: {
                                    type: 'text',
                                    value: info.tooltip.suffix,
                                },
                                fieldClass: 'form-control-sm',
                                labelText: 'Suffix',
                                labelClass: 'text-wrap',
                                events: {
                                    change: (e) => {
                                        const value = e.target.value
                                        if (value === info.tooltip.suffix) return
                    
                                        info.tooltip.suffix = value
                                        if (info.tooltip.active) updateLeafletGeoJSONLayer(layer, {
                                            geojson: layer.toGeoJSON(),
                                            controller,
                                        })
                                    }
                                }
                            },

                            enablePopup: {
                                handler: createFormCheck,
                                checked: info.popup.active,
                                formCheckClass: 'w-100 flex-shirnk-1 mt-2',
                                labelInnerText: 'Popup',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === info.popup.active) return
                    
                                        info.popup.active = value
                                        updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            popupProps: {
                                handler: createTagifyField,
                                inputClass: `w-75 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,
                                inputTag: 'textarea',
                                enabled: 0,
                                dropdownClass: `my-1 border-0`,
                                userInput: true,
                                scopeStyle: {
                                    height: '58px',
                                },
                                name:  `popupProps`,
                                placeholder: 'Select properties',
                                currentValue: JSON.stringify((info.popup.properties || []).map(i => {return {value:i}})),
                                events: {
                                    focus: async (e) => {
                                        const tagify = Tagify(form.elements['popupProps'])
                                        
                                        const options = layer._properties.info.attributes
                                        const optionsSet = options.length ? new Set(options) : []
                                        const sortedOptions = [...optionsSet].filter(i => {
                                            return !(info.popup.properties || []).includes(i)
                                        }).sort()
                                        tagify.settings.whitelist = sortedOptions
                                    },
                                },
                                callbacks: {
                                    ...(() => Object.fromEntries(['blur'].map(i => [i, (e) => {
                                        const tagify = e.detail.tagify
                                        const values = tagify.value.map(i => i.value)
                            
                                        if (values.every(i => info.popup.properties.includes(i)) && info.popup.properties.every(i => values.includes(i)) ) return
                            
                                        info.popup.properties = values
                                        if (info.popup.active) updateLeafletGeoJSONLayer(layer, {
                                            geojson: layer.toGeoJSON(),
                                            controller,
                                        })
                                    }])))()
                                }
                            },

                        },
                        className: 'flex-wrap gap-1'
                    },
                    'Feature Count Limit': {
                        fields: {
                            enableFeatureLimit: {
                                handler: createFormCheck,
                                checked: limits.active,
                                formCheckClass: 'w-100 flex-grow-1 mt-2',
                                labelInnerText: 'Enable feature count limit',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === limits.active) return
                    
                                        limits.active = value

                                        updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            maxFeatureCount: {
                                handler: createFormFloating,
                                containerClass: 'w-10 flex-grow-1',
                                fieldAttrs: {
                                    type: 'number',
                                    min: 0,
                                    max: 50000,
                                    value: limits.max,
                                },
                                fieldClass: 'form-control-sm',
                                labelText: 'Maximum feature count',
                                labelClass: 'text-wrap',
                                events: {
                                    change: (e) => {
                                        const value = e.target.value = Number(e.target.value)
                                        if (value === limits.max) return
                    
                                        limits.max = value
                                        
                                        if (limits.active) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                }
                            },
                            limitMethod: {
                                handler: createFormFloating,
                                containerClass: 'w-50',
                                fieldTag:'select',
                                labelText: 'Method',
                                options:{
                                    'limit':'Limit to set maximum',
                                    'scale':'Increase minimum visible scale',
                                    'zoomin':'Zoom in to meet set maximum',
                                },
                                currentValue: limits.method,
                                fieldClass:'form-select-sm',
                                events: {
                                    change: (e) => {
                                        const field = e.target
                                        const value = field.value
                                        
                                        limits.method = value
                                        
                                        if (limits.active) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                }
                            },
                        },
                        className: 'flex-wrap gap-2'
                    },
                    'Filter': {
                        fields: {
                            enableType: {
                                handler: createFormCheck,
                                checked: filters.type.active,
                                formCheckClass: 'flex-grow-1',
                                labelInnerText: 'Filter by type',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === filters.type.active) return
                    
                                        Object.keys(form.elements).filter(i => i.startsWith('typeFilter-')).forEach(i => {
                                            form.elements[i].disabled = !value
                                        })
    
                                        filters.type.active = value
                                        updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            toggleType: {
                                handler: createButton,
                                name: 'typeFilter-toggle',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-toggles',
                                title: 'Toggle all types',
                                disabled: !filters.type.active,
                                events: {
                                    click: () => {
                                        const fields = Object.values(form.elements).filter(f => {
                                            return (f.getAttribute('name') || '').startsWith('typeFilter-')
                                            && f.getAttribute('type') === 'checkbox'
                                        })
                                        const check = fields.some(f => !f.checked)
    
                                        fields.forEach(field => {
                                            field.checked = check
                                            
                                            const name = form.querySelector(`label[for="${field.id}"]`).innerText
                                            filters.type.values[name] = check
                                        })
    
                                        updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                }
                            },
                            typeFilter: {
                                handler: createCheckboxOptions,
                                name: 'typeFilter',
                                containerClass: 'p-3 border rounded flex-wrap flex-grow-1 w-100 gap-2 mb-3',
                                options: (() => {
                                    const options = {}
                                    for (const type in filters.type.values) {
                                        options[type] = {
                                            checked: filters.type.values[type],
                                            disabled: !filters.type.active,
                                            events: {
                                                click: () => {
                                                    Object.values(form.elements).filter(f => {
                                                        return (f.getAttribute('name') || '').startsWith('typeFilter-')
                                                        && f.getAttribute('type') === 'checkbox'
                                                    }).forEach(field => {
                                                        const option = form.querySelector(`label[for="${field.id}"]`).innerText
                                                        filters.type.values[option] = field.checked
                                                    })
                                                    updateLeafletGeoJSONLayer(layer, {
                                                        controller,
                                                    })
                                                }
                                            }
                                        }
                                    }
                                    return options
                                })()
                            },
    
                            enableProps: {
                                handler: createFormCheck,
                                checked: filters.properties.active,
                                formCheckClass: 'flex-grow-1',
                                labelInnerText: 'Filter by properties',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const propertyFilters = filters.properties
                                        const value = e.target.checked
                                        if (value === propertyFilters.active) return
                    
                                        Object.keys(form.elements).filter(i => i.startsWith('propFilter-')).forEach(i => {
                                            form.elements[i].disabled = !value
                                        })
    
                                        body.querySelector(`#${filterContainerId}-prop`).querySelectorAll('.tagify').forEach(i => {
                                            value ? i.removeAttribute('disabled') : i.setAttribute('disabled', true)
                                        })
    
                                        propertyFilters.active = value
                                        if (Object.values(propertyFilters.values ?? {}).some(i => {
                                            return i.active && i.property && i.values.length
                                        })) updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            operatorProps: {
                                handler: createBadgeSelect,
                                selectClass: `border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,
                                attrs: {name: 'propFilter-operator'},
                                disabled: !filters.properties.active,
                                options: {
                                    '': 'Select an operator',
                                    '&&': '&&',
                                    '||': '||',
                                },
                                events: {
                                    change:  (e) => {
                                        const propertyFilters = filters.properties
    
                                        let value = e.target.value
                                        if (value === '') value = e.target.value = propertyFilters.operator
                                        if (value === propertyFilters.operator) return
    
                                        propertyFilters.operator = value
                                        if (Object.values(propertyFilters.values ?? {}).some(i => {
                                            return i.active && i.property && i.values.length
                                        })) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                },
                                currentValue: filters.properties.operator,
                            },
                            newProp: {
                                handler: createButton,
                                name: 'propFilter-new',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-plus-lg',
                                title: 'Add a new property filter',
                                disabled: !filters.properties.active,
                                events: {
                                    click: () => {
                                        const id = generateRandomString()
                                        filters.properties.values[id] = {
                                            active: true,
                                            handler: 'equals',
                                            case: true,
                                            value: true,
                                            values: [],
                                        }
                                        body.querySelector(`#${filterContainerId}-prop`).appendChild(getPropertyFilterForm(id))
                                    }
                                }
                            },
                            toggleProp: {
                                handler: createButton,
                                name: 'propFilter-toggle',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-toggles',
                                title: 'Toggle all property filters',
                                disabled: !filters.properties.active,
                                events: {
                                    click: () => {
                                        const fields = Object.values(form.elements).filter(f => {
                                            return (f.getAttribute('name') || '').startsWith('propFilter-')
                                            && f.getAttribute('type') === 'checkbox'
                                        })
                                        const check = fields.every(f => !f.checked)
    
                                        fields.forEach(field => {
                                            field.checked = check
                                        })
    
                                        Object.values(filters.properties.values).forEach(f => f.active = check)
    
                                        updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                }
                            },
                            removeProp: {
                                handler: createButton,
                                name: 'propFilter-remove',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-trash-fill',
                                title: 'Remove all property filters',
                                disabled: !filters.properties.active,
                                events: {
                                    click: () => {
                                        const propertyFilters = filters.properties
    
                                        body.querySelector(`#${filterContainerId}-prop`).innerHTML = ''
                                        propertyFilters.values = {}
                                        if (Object.values(propertyFilters.values ?? {}).some(i => {
                                            return i.active && i.property && i.values.length
                                        })) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })                
                                    }
                                }
                            },
                            propFilter: {
                                handler: ({parent}={}) => {
                                    const container = customCreateElement({
                                        id: `${filterContainerId}-prop`,
                                        className: 'd-flex flex-column w-100 gap-2',
                                        parent,
                                    })  
    
                                    for (const id in filters.properties.values) {
                                        container.appendChild(getPropertyFilterForm(id))
                                    }
                                }
                            },
    
                            enableGeom: {
                                handler: createFormCheck,
                                checked: filters.geom.active,
                                formCheckClass: 'flex-grow-1',
                                labelInnerText: 'Filter by geometry',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === filters.geom.active) return
                    
                                        Object.keys(form.elements).filter(i => i.startsWith('geomFilter-')).forEach(i => {
                                            form.elements[i].disabled = !value
                                        })
    
                                        filters.geom.active = value
                                        if (Object.keys(filters.geom.values || {}).length) updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            operatorGeom: {
                                handler: createBadgeSelect,
                                selectClass: `border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,
                                attrs: {name: 'geomFilter-operator'},
                                disabled: !filters.geom.active,
                                options: {
                                    '': 'Select an operator',
                                    '&&': '&&',
                                    '||': '||',
                                },
                                currentValue: filters.properties.operator,
                                events: {
                                    change:  (e) => {
                                        let value = e.target.value
                                        if (value === '') value = e.target.value = filters.geom.operator
                                        if (value === filters.geom.operator) return
    
                                        filters.geom.operator = value
                                        if (Object.keys(filters.geom.values || {}).length) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                },
                            },
                            newGeom: {
                                handler: createButton,
                                name: 'geomFilter-new',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-plus-lg',
                                title: 'Add a new spatial constraint',
                                disabled: !filters.geom.active,
                                events: {
                                    click: () => {
                                        const id = generateRandomString()
                                        filters.geom.values[id] = {
                                            active: true,
                                            handler: 'booleanIntersects',
                                            value: true,
                                            geoms: [],
                                        }
                                        body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))
                                    }
                                }
                            },
                            bboxGeom: {
                                handler: createButton,
                                name: 'geomFilter-bbox',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-bounding-box-circles',
                                title: 'Add map extent as spatial constraint',
                                disabled: !filters.geom.active,
                                events: {
                                    click: () => {
                                        const id = generateRandomString()
                                        filters.geom.values[id] = {
                                            active: true,
                                            handler: 'booleanIntersects',
                                            value: true,
                                            geoms: [turf.bboxPolygon(getLeafletMapBbox(map)).geometry]
                                        }
                                        body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))
                                        updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })                
                                    }
                                }
                            },
                            toggleGeom: {
                                handler: createButton,
                                name: 'geomFilter-toggle',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-toggles',
                                title: 'Toggle all spatial constraints',
                                disabled: !filters.geom.active,
                                events: {
                                    click: () => {
                                        const fields = Object.values(form.elements).filter(f => {
                                            if (!f.getAttribute) return
                                            return (f.getAttribute('name') || '').startsWith('geomFilter-')
                                            && f.getAttribute('type') === 'checkbox'
                                        })
                                        const check = fields.every(f => !f.checked)
    
                                        fields.forEach(field => {
                                            field.checked = check
                                        })
    
                                        Object.values(filters.geom.values).forEach(f => f.active = check)
    
                                        updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })
                                    }
                                }
                            },
                            removeGeom: {
                                handler: createButton,
                                name: 'geomFilter-remove',
                                className: 'fs-12 bg-transparent border-0 p-0 ms-2',
                                iconSpecs: 'bi bi-trash-fill',
                                title: 'Remove all spatial constraints',
                                disabled: !filters.geom.active,
                                events: {
                                    click: () => {
                                        body.querySelector(`#${filterContainerId}-geom`).innerHTML = ''
                                        const update = Object.values(filters.geom.values).some(f => f.active && f.geoms?.length)
                                        filters.geom.values = {}
                                        if (update) updateLeafletGeoJSONLayer(layer, {
                                            controller,
                                        })                
                                    }
                                }
                            },
                            geomFilter: {
                                handler: ({parent}={}) => {
                                    const container = customCreateElement({
                                        id: `${filterContainerId}-geom`,
                                        className: 'd-flex flex-column w-100 gap-2',
                                        parent,
                                    })  
    
                                    for (const id in filters.geom.values) {
                                        container.appendChild(getGeomFilterForm(id))
                                    }
                                }
                            },
                        },
                        className: 'flex-wrap gap-2'
                    },
                    'Transform Geometries': {
                        fields: {
                            enableSimplify: {
                                handler: createFormCheck,
                                checked: transformations.simplify.active,
                                formCheckClass: 'flex-grow-1 w-100',
                                labelInnerText: 'Simplify feature geometries',
                                role: 'switch',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === transformations.simplify.active) return

                                        Array.from(form.simplify).forEach(f => {
                                            f.disabled = !value
                                        })
    
                                        transformations.simplify.active = value
                                        updateLeafletGeoJSONLayer(layer, {
                                            geojson: value ? layer.toGeoJSON() : null,
                                            controller,
                                        })
                                    }
                                }
                            },
                            simplifyOptions: {
                                handler: ({parent}={}) => {
                                    const container = createCheckboxOptions({
                                        parent,
                                        name: 'simplify',
                                        type: 'radio',
                                        containerClass: 'p-3 border rounded flex-wrap flex-grow-1 w-100 gap-2',
                                        options: (() => {
                                            const options = {}
                                            for (const i in transformations.simplify.values) {
                                                const params = transformations.simplify.values[i]
                                                options[i] = {
                                                    checked: params.active,
                                                    disabled: !transformations.simplify.active,
                                                    inputAttrs: {value: params.fn},
                                                    events: {
                                                        click: () => {
                                                            let changed = false

                                                            Array.from(form.simplify).forEach(f => {
                                                                const name = form.querySelector(`label[for="${f.id}"]`).innerText
                                                                if (transformations.simplify.values[name].active === f.checked) return
                                                                
                                                                transformations.simplify.values[name].active = f.checked
                                                                changed = true
                                                            })
                                                            
                                                            if (changed) updateLeafletGeoJSONLayer(layer, {
                                                                controller,
                                                            })
                                                        },
                                                    }
                                                }
                                            }
                                            return options
                                        })()
                                    })

                                    const simplify = transformations.simplify.values['Simplify by tolerance']

                                    const simplifyToggle = container.lastChild
                                    const simplifyContainer = customCreateElement({
                                        parent:container,
                                        className:'d-flex gap-2 flex-nowrap',
                                    })
                                    simplifyContainer.appendChild(simplifyToggle)

                                    const toleranceField = customCreateElement({
                                        parent: simplifyContainer,
                                        className: 'rounded border-0 small px-2',
                                        tag: 'input',
                                        attrs: {
                                            type: 'number',
                                            min: 0,
                                            step: 0.0001,
                                            placeholder: 'Tolerance',
                                            value: simplify.options.tolerance
                                        },
                                        events: {
                                            change: (e) => {
                                                const value = e.target.value
                                                if (value === '' || isNaN(value)) {
                                                    e.target.value = simplify.options.tolerance
                                                    return
                                                }

                                                simplify.options.tolerance = Number(value)
                                                if (simplify.active) updateLeafletGeoJSONLayer(layer, {
                                                    controller,
                                                })
                                            }
                                        }
                                    })
                                },
                            },
                            transformScaleCheck: {
                                handler: createFormCheck,
                                checked: transformations.simplify.scale.active,
                                formCheckClass: 'w-25 border rounded py-1 pe-2 ps-4',
                                formCheckStyle: {height: '32px'},
                                labelInnerText: 'Scale',
                                role: 'checkbox',
                                // labelClass: '',
                                events: {
                                    click: (e) => {
                                        const value = e.target.checked
                                        if (value === transformations.simplify.scale.active) return
                    
                                        form.elements.transformScaleMin.disabled = !value
                                        form.elements.transformScaleMax.disabled = !value

                                        transformations.simplify.scale.active = value
                                        updateLeafletGeoJSONLayer(layer, {controller})
                                    }
                                }
                            },
                            transformScaleMin: {    
                                handler: createInputGroup,
                                fieldAttrs: {
                                    name:'transformScaleMin',
                                    type:'number',
                                    min: '10',
                                    max: transformations.simplify.scale.max,
                                    step: '10',
                                    value: transformations.simplify.scale.min,
                                    placeholder: 'Maximum',
                                },
                                prefixHTML: `<span class="fs-12">1:</span>`,
                                suffixHTML: `<span class="fs-12">m</span>`,
                                fieldClass: 'form-control-sm fs-12',
                                disabled: !transformations.simplify.scale.active,
                                inputGroupClass: 'w-25 flex-grow-1',
                                events: {
                                    'change': (e) => {
                                        const field = e.target
                                        const maxScaleField = form.elements.transformScaleMax
                                        
                                        if (!field.value) {
                                            field.value = 10
                                        } else {
                                            const maxScaleValue = parseInt(maxScaleField.value)
                                            if (maxScaleValue < parseInt(field.value)) field.value = maxScaleValue
                                        }
        
                                        transformations.simplify.scale.min = parseInt(field.value)
                                        maxScaleField.setAttribute('min', field.value)
        
                                        updateLeafletGeoJSONLayer(layer, {controller})
                                    },
                                    'click': visibilityFieldsClick,
                                }
                            },
                            transformScaleMax: {
                                handler: createInputGroup,
                                fieldAttrs: {
                                    name:'transformScaleMax',
                                    type:'number',
                                    min: transformations.simplify.scale.min,
                                    max: '5000000',
                                    step: '10',
                                    value: transformations.simplify.scale.max,
                                    placeholder: 'Minimum',
                                },
                                prefixHTML: `<span class="fs-12">1:</span>`,
                                suffixHTML: `<span class="fs-12">m</span>`,
                                fieldClass: 'form-control-sm fs-12',
                                disabled: !transformations.simplify.scale.active,
                                inputGroupClass: 'w-25 flex-grow-1',
                                events: {
                                    'change': (e) => {
                                        const field = e.target
                                        const minScaleField = form.elements.transformScaleMin
                                        
                                        if (!field.value) {
                                            field.value = 5000000
                                        } else {
                                            const minScaleValue = parseInt(minScaleField.value)
                                            if (minScaleValue > parseInt(field.value)) field.value = minScaleValue
                                        }
                                        
                                        transformations.simplify.scale.max = parseInt(field.value)
                                        minScaleField.setAttribute('max', field.value)
                                        
                                        updateLeafletGeoJSONLayer(layer, {controller})
                                    },
                                    'click': visibilityFieldsClick,
                                }
                            },
                        },
                        className: 'flex-wrap gap-2'   
                    }
                } : {})
            }
        }        
        
        Object.keys(styleFields).forEach(categoryName => {
            const category = document.createElement('div')
            category.className = `d-flex flex-column gap-2`
            body.appendChild(category)

            const categoryCollase = document.createElement('div')
            categoryCollase.id = generateRandomString()
            categoryCollase.className = 'collapse show'

            const categoryHeader = document.createElement('div')
            categoryHeader.className = `d-flex fw-medium`
            categoryHeader.setAttribute('data-bs-toggle', 'collapse')
            categoryHeader.setAttribute('aria-expanded', 'true')
            categoryHeader.setAttribute('data-bs-target', `#${categoryCollase.id}`)
            categoryHeader.setAttribute('aria-controls', categoryCollase.id)
            categoryHeader.style.cursor = 'pointer'
            
            const categoryLabel = document.createElement('span')
            categoryLabel.innerText = categoryName
            categoryHeader.appendChild(categoryLabel)
            
            createIcon({
                className:'dropdown-toggle ms-auto', 
                parent:categoryHeader, 
                peNone:true
            })

            category.appendChild(categoryHeader)
            category.appendChild(categoryCollase)

            const categorySections = document.createElement('div')
            categorySections.className = 'd-flex flex-column gap-3'
            categoryCollase.appendChild(categorySections)

            const sections = styleFields[categoryName]
            Object.keys(sections).forEach(sectionName => {
                const data = sections[sectionName]
    
                const section = document.createElement('div')
                section.className = `d-flex flex-column gap-2`
                categorySections.appendChild(section)

                const sectionCollase = document.createElement('div')
                sectionCollase.id = data.id ?? generateRandomString()
                sectionCollase.className = 'collapse show'
    
                const sectionHeader = document.createElement('div')
                sectionHeader.className = `d-flex fw-normal`
                sectionHeader.setAttribute('data-bs-toggle', 'collapse')
                sectionHeader.setAttribute('aria-expanded', 'true')
                sectionHeader.setAttribute('data-bs-target', `#${sectionCollase.id}`)
                sectionHeader.setAttribute('aria-controls', sectionCollase.id)
                sectionHeader.style.cursor = 'pointer'
                
                const sectionLabel = document.createElement('span')
                sectionLabel.innerText = sectionName
                sectionHeader.appendChild(sectionLabel)
                
                createIcon({
                    className:'dropdown-toggle ms-auto', 
                    parent:sectionHeader, 
                    peNone:true
                })
    
                section.appendChild(sectionHeader)
                section.appendChild(sectionCollase)
    
                const sectionFields = document.createElement('div')
                sectionFields.className = `d-flex align-items-center w-100 ${data.className}`
                sectionCollase.appendChild(sectionFields)

                const fields = data.fields
                Object.keys(fields).forEach(fieldName => {
                    const params = fields[fieldName]
                    if (params?.handler) params.handler({
                        ...params, 
                        parent: sectionFields,
                    })
                })
            })
        })
    })
}
