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

    const vectorLayerValidators = [
        (l) => l instanceof L.GeoJSON && l.getLayers().length,
    ]

    const getLayerFieldParams = ({
        validators=vectorLayerValidators,
        label='Layer',
        required=true,
        value=null,
    }={}) => {
        return {
            required,
            value,
            createElement: ({parent, name, fieldParams}={}) => {
                return createInputGroup({
                    parent,
                    prefixHTML: `<span class='fs-12'>${label}</span>`,
                    fieldTag: 'select', 
                    fieldClass: 'form-select-sm',
                    fieldAttrs: {name},
                    events: {
                        focus: (e) => {
                            leafletMapLegendLayersToSelectOptions(map, e.target, {
                                layer: fieldParams.value,
                                validators,  
                            })

                            console.log('add workflow outputs as options')
                        },
                        change: (e) => {
                            const layerId = parseInt(e.target.value)
                            const layer = map._handlers.getLegendLayer(layerId)
                            fieldParams.value = layer ?? null
                        },
                    }
                })
            } ,
        }
    }

    const tools = {
        vectorTransform: {
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
                        layer: getLayerFieldParams()
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
                        layer: getLayerFieldParams()
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
                toPoints: {
                    title: 'Features to Points',
                    details: {
                        description: 'Convert each feature in a vector layer into point features.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: getLayerFieldParams(),
                        method: {
                            required: true,
                            value: null,
                            createElement: ({parent, name, fieldParams}={}) => {
                                return createCheckboxOptions({
                                    parent,
                                    name,
                                    type: 'radio',
                                    containerClass: 'p-2 border rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12',
                                    options: (() => {
                                        const methods = {
                                            center: 'Center',
                                            centerOfMass: 'Center of mass',
                                            centroid: 'Centroid',
                                            pointOnFeature: 'Point on feature',
                                            // explode: 'Corners',
                                            // centerMean: 'Weighted mean center',
                                            // centerMedian: 'Median center among corners',
                                        }

                                        const options = {}
                                        for (const method in methods) {
                                            options[method] = {
                                                checked: false,
                                                label: methods[method],
                                                events: {
                                                    click: (e) => {
                                                        fieldParams.value = e.target.value
                                                    }
                                                }
                                            }
                                        }
                                        return options
                                    })()
                                })
                            }
                        },
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = turf.clone(inputLayer.toGeoJSON())
                        geojson.features = geojson.features.map(f => {
                            f.geometry = turf[params.method](f).geometry
                            return f
                        })

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > feature ${params.method}`,
                            }
                        })
                        return layer
                    }
                },
            }
        },
        vectorFilter: {
            title: 'Vector Filtering',
            tools: {
                typeFilter: {
                    title: 'Filter by Geometry Type',
                    details: {
                        description: 'Extracts features with selected geomtry types from the input vector layer.',
                    },
                    fields: {
                        layer: getLayerFieldParams(),
                        types: {
                            required: true,
                            value: null,
                            createElement: ({parent, name, fieldParams}={}) => {
                                return createCheckboxOptions({
                                    parent,
                                    name,
                                    containerClass: 'p-2 border rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12',
                                    options: (() => {
                                        const options = {}
                                        for (const suffix of Array('Point', 'LineString', 'Polygon')) {
                                            for (const type of Array(suffix, `Multi${suffix}`)) {
                                                options[type] = {
                                                    checked: false,
                                                    events: {
                                                        click: (e) => {
                                                            const value = e.target.value
                                                            fieldParams.value = fieldParams.value ?? []
                                                            
                                                            if (e.target.checked) {
                                                                if (!fieldParams.value.includes(value)) {
                                                                    fieldParams.value.push(value)
                                                                }
                                                            } else {
                                                                fieldParams.value = fieldParams.value.filter(i => i !== value)
                                                            }

                                                            if (!fieldParams.value.length) {
                                                                fieldParams.value = null
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        return options
                                    })()
                                })
                            }
                        }
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = turf.clone(inputLayer.toGeoJSON())
                        geojson.features = geojson.features.filter(f => {
                            return params.types.includes(f.geometry.type)
                        })

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > filtered ${params.types.join(', ')}`,
                            }
                        })
                        return layer
                    }
                },
            }
        }
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
    
    const toolsContainer = customCreateElement({
        parent,
        id: `${parent.parentElement.id}-tools`,
        className: 'p-3 fs-14 d-flex flex-column gap-2'
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

                const toolString = `${toolParams.title} | ${setParams.title} | ${toolParams.details.description}`.toLowerCase()
                if (keywords.length && keywords.every(k => !toolString.includes(k.toLowerCase()))) continue
    
                const toolContainer = customCreateElement({
                    parent: setToolsContainer,
                    id: `${setContainer.id}-${tool}`,
                    className: 'd-flex flex-column',
                })
    
                const toolHead = customCreateElement({
                    parent: toolContainer,
                    className: 'd-flex flex-nowrap justify-content-between border p-2',
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
                    className: 'd-flex flex-column gap-2 border border-top-0 p-2'
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
                    const disabled = Object.values(toolParams.fields).some(i => i.required && !i.value)
                    Array.from(toolForm.querySelectorAll(`#${toolForm.id}-btns > button`)).forEach(b => b.disabled = disabled)
                }
    
                for (const name in toolParams.fields) {
                    const fieldParams = toolParams.fields[name]
                    const element = fieldParams.createElement({
                        parent: toolForm,
                        name,
                        fieldParams,
                    })
                }

                Array.from(toolForm.querySelectorAll('[name]')).forEach(f => f.addEventListener('change', toggleToolBtns))
    
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
                    className: 'badge btn btn-sm btn-success mt-2',
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
