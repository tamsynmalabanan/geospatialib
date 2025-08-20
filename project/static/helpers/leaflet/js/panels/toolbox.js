const handleLeafletToolboxPanel = (map, parent) => {
    // const workflowContainer = customCreateElement({
    //     parent,
    //     className: 'p-3 border-bottom position-relative'
    // })
    
    // const workflowLabel = customCreateElement({
    //     parent: workflowContainer,
    //     tag: 'span',
    //     innerText: 'Workflow',
    //     className: 'text-muted position-absolute ms-1 user-select-none opacity-50'
    // })
    
    // const workflow = customCreateElement({
    //     parent: workflowContainer,
    //     id: `${parent.parentElement.id}-workflow`,
    //     className: `rounded bg-${getPreferredTheme()} bg-adjusted overflow-auto`,
    //     style: {
    //         height: '100px',
    //     }
    // })

    // const workflowBtn = customCreateElement({
    //     parent: workflowContainer,
    //     tag: 'button',
    //     attrs: {disabled: true},
    //     className: 'bg-transparent border-0 p-0 bi bi-play-fill text-success fs-3 position-absolute bottom-0 end-0 mb-3 me-3'
    // })

    const tools = {
        transform: {
            title: 'Vector Transformation',
            tools: {
                flatten: {
                    title: 'Flatten Multi-part Geometries',
                    details: {
                        description: 'Convert multi-part vector features in a layer into single-part features.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: {
                            layerField: true,
                            validators: [
                                (l) => {
                                    return l instanceof L.GeoJSON && l.getLayers().length
                                }
                            ],
                            
                            tag: 'select',
                            className: 'form-select-sm',
                            label: 'Layer',
                            required: true,
                            value: null,
                        }
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = turf.flatten(turf.clone(inputLayer.toGeoJSON()))
                        geojson.features.forEach(f => delete f.properties.__gsl_id__)

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > flattened`,
                            }
                        })
                        return layer
                    }
                },
                unkink: {
                    title: 'Unkink Polygons',
                    details: {
                        description: 'Convert self-intersecting polygon features in a layer into single-part features.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: {
                            layerField: true,
                            validators: [
                                (l) => {
                                    return l instanceof L.GeoJSON && l.getLayers().length
                                }
                            ],
                            
                            tag: 'select',
                            className: 'form-select-sm',
                            label: 'Layer',
                            required: true,
                            value: null,
                        }
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = turf.unkinkPolygon(turf.clone(inputLayer.toGeoJSON()))
                        geojson.features.forEach(f => delete f.properties.__gsl_id__)

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > unkinked`,
                            }
                        })
                        return layer
                    }
                },
            }
        },
    }

    const searchContainer = customCreateElement({
        parent,
        id: `${parent.parentElement.id}-search`,
        className: 'px-3 pt-3 pb-0 fs-14'
    })

    const searchField = customCreateElement({
        parent: searchContainer,
        tag: 'input',
        className: 'ps-0 border-0 rounded-0 focus-underline-primary box-shadow-none bg-transparent w-100 fs-14',
        attrs: {
            list: `${searchContainer.id}-list`,
            type: 'search',
            placeholder: 'Search toolbox...'
        },
        events: {
            change: (e) => {
                renderTools({
                    keywords: e.target.value.trim().split(' ')
                })
            }
        }
    })

    const searchList = customCreateElement({
        parent: searchContainer,
        tag: 'datalist',
        id: `${searchContainer.id}-list`,
    })

    Object.values(tools).flatMap(set => {
        return Object.values(set.tools).map(tool => {
            return `${tool.title} | ${set.title} | ${tool.details.description}`
        })
    }).forEach(i => {
        searchList.appendChild(customCreateElement({
            tag: 'option',
            attrs: {value: i}
        }))
    })
    
    const toolsContainer = customCreateElement({
        parent,
        id: `${parent.parentElement.id}-tools`,
        className: 'p-3 fs-14'
    })
    
    const group = map._handlers.getLayerGroups().local

    const renderTools = ({keywords=[]}={}) => {
        toolsContainer.innerHTML = ''

        for (const set in tools) {
            const setParams = tools[set]
    
            const setContainer = customCreateElement({
                parent: toolsContainer,
                id: `${toolsContainer.id}-${set}`,
                className: 'd-flex flex-column gap-1',
            })
    
            const setHeader = customCreateElement({
                parent: setContainer,
                className: 'd-flex flex-nowrap justify-content-between fw-bold',
                attrs:{
                    'data-bs-toggle': "collapse",
                    'data-bs-target': `#${setContainer.id}-collapse`,
                    'aria-expanded': "true",
                    'aria-controls': `${setContainer.id}-collapse`,
                }
            })
    
            const setLabel = customCreateElement({
                parent: setHeader,
                tag: 'span',
                className: 'user-select-none',
                innerText: setParams.title
            })
    
            const setToggle = customCreateElement({
                parent: setHeader,
                tag: 'i',
                className: 'dropdown-toggle',
            })
    
            const setToolsCollapse = customCreateElement({
                parent: setContainer,
                id: `${setContainer.id}-collapse`,
                className: 'collapse show'
            })
    
            const setToolsContainer = customCreateElement({
                parent: setToolsCollapse,
                className: 'd-flex flex-column gap-2 border-start border-2 ps-2'
    
            })
    
            for (const tool in setParams.tools) {
                const toolParams = setParams.tools[tool]

                if (keywords.length && keywords.every(k => !`${toolParams.title} | ${setParams.title} | ${toolParams.details.description}`.includes(k))) continue
    
                const toolContainer = customCreateElement({
                    parent: setToolsContainer,
                    id: `${setContainer.id}-${tool}`,
                    className: 'd-flex flex-column gap-1',
                })
    
                const toolHead = customCreateElement({
                    parent: toolContainer,
                    className: 'd-flex flex-nowrap justify-content-between ',
                    attrs:{
                        'data-bs-toggle': "collapse",
                        'data-bs-target': `#${toolContainer.id}-collapse`,
                        'aria-expanded': "false",
                        'aria-controls': `${toolContainer.id}-collapse`,
                    }
                })
    
                const toolLabel = customCreateElement({
                    parent: toolHead,
                    tag: 'span',
                    className: 'user-select-none',
                    innerText: toolParams.title
                })
    
                const toolToggle = customCreateElement({
                    parent: toolHead,
                    tag: 'i',
                    className: 'dropdown-toggle',
                })
    
                const toolCollapse = customCreateElement({
                    parent: toolContainer,
                    id: `${toolContainer.id}-collapse`,
                    className: 'collapse'
                })
    
                const toolCollapseContainer = customCreateElement({
                    parent: toolCollapse,
                    className: 'd-flex flex-column gap-2 border-start border-2 ps-2'
                })
    
                const toolDetails = customCreateElement({
                    parent: toolCollapseContainer,
                    className: 'd-flex flex-column fs-12',
                })
    
                const toolDesc = customCreateElement({
                    parent: toolDetails,
                    innerHTML: toolParams.details.description
                })
    
                // const toolInputs = customCreateElement({
                //     parent: toolDetails,
                //     innerHTML: toolParams.details.inputs
                // })
    
                // const toolOutputs = customCreateElement({
                //     parent: toolDetails,
                //     innerHTML: toolParams.details.outputs
                // })
    
                const toolForm = customCreateElement({
                    parent: toolCollapseContainer,
                    id: `${toolContainer.id}-form`,
                    tag: 'form',
                    className: 'd-flex flex-wrap gap-2'
                })
    
                const toggleToolBtns = () => {
                    const disabled = Object.values(toolParams.fields).every(i => i.required && !i.value)
                    Array.from(toolForm.querySelectorAll(`#${toolForm.id}-btns > button`)).forEach(b => b.disabled = disabled)
                }
    
                for (const name in toolParams.fields) {
                    const fieldParams = toolParams.fields[name]
    
                    const field = createInputGroup({
                        parent: toolForm,
                        prefixHTML: `<span class='fs-12'>${fieldParams.label}</span>`,
                        fieldTag: fieldParams.tag, 
                        fieldClass: fieldParams.className,
                        fieldAttrs: {name},
                        events: {
                            ...(fieldParams.layerField ? {
                                focus: (e) => {
                                    leafletMapLegendLayersToSelectOptions(map, field, {
                                        layer: fieldParams.value,
                                        validators: fieldParams.validators ?? [],  
                                    })
    
                                    console.log('add workflow outputs as options')
                                },
                                change: (e) => {
                                    const layerId = parseInt(field.value)
                                    const layer = map._handlers.getLegendLayer(layerId)
                                    fieldParams.value = layer
    
                                    toggleToolBtns()
                                },
                            } : {
                                change: (e) => {
                                    toggleToolBtns()
                                }
                            }),
                        }
                    }).querySelector('select')
                }
    
                const toolBtns = customCreateElement({
                    parent: toolForm,
                    id: `${toolForm.id}-btns`,
                    attrs: {type: 'button'},
                    className: 'd-flex flex-nowrap gap-1 justify-content-end w-100'
                })

                // const toolAdd = customCreateElement({
                //     parent: toolBtns,
                //     tag: 'button',
                //     className: 'bg-transparent border-0 p-0 bi bi-node-plus text-success fs-5'
                // })
                
                const toolStart = customCreateElement({
                    parent: toolBtns,
                    tag: 'button',
                    attrs: {type: 'button'},
                    className: 'badge btn btn-sm btn-success',
                    // className: 'bg-transparent border-0 p-0 bi bi-play-fill text-success fs-5',
                    innerText: 'Run',
                    events: {
                        click: async (e) => {
                            const params = {}
                            Object.keys(toolParams.fields).forEach(name => params[name] = toolParams.fields[name].value)
                            
                            const layer = await toolParams.handler(params)
                            if (layer) group.addLayer(layer)
                        }
                    }
                })
    
                toggleToolBtns()
            }
        }
    }

    renderTools()
}
