const handleLeafletToolboxPanel = (map, parent) => {
    const group = map._handlers.getLayerGroups().local

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

    const templateFieldHandlers = {
        vectorLayer: ({
            label='Layer',
            required=true,
            value=null,
            validators=[]
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
                                    validators: [(l) => l instanceof L.GeoJSON].concat(validators),  
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
        },
        dissolveFeatures: ({
            label='Dissolve features',
            required=false,
            value=false,
        }={}) => {
            return {
                required,
                value,
                createElement: ({parent, name, fieldParams}={}) => {
                    return createFormCheck({
                        parent, 
                        name, 
                        labelInnerText:label, 
                        fieldClass:'',
                        formCheckClass:'border rounded py-2 pe-2 ps-4 flex-grow-1 w-25', 
                        checked: value,
                        labelClass:'fs-12 text-wrap',
                        events: {
                            click: (e) => fieldParams.value = e.target.checked
                        },
                        style:{}
                    })
                }
            }
        },
        coveredFeatures: ({
            label='Covered features',
            required=true,
            value='visible',
        }={}) => {
            return {
                required,
                value,
                createElement: ({parent, name, fieldParams}={}) => {
                    const container = customCreateElement({
                        parent,
                        className: 'input-group d-flex flex-nowrap w-50 flex-grow-1'
                    })

                    customCreateElement({
                        parent: container,
                        tag: 'span',
                        innerText: label,
                        className: 'fs-12 input-group-text',
                    })

                    const checkbox = createCheckboxOptions({
                        parent: container,
                        name,
                        type: 'radio',
                        containerClass: 'p-2 rounded flex-wrap flex-grow-1 gap-2 fs-12 border flex-grow-1 rounded-start-0 border-start-0',
                        options: (() => {
                            const methods = {
                                visible: 'visible',
                                stored: 'stored',
                                selected: 'selected',
                            }

                            const options = {}
                            for (const method in methods) {
                                options[method] = {
                                    checked: method === value,
                                    label: methods[method],
                                    events: {
                                        click: (e) => fieldParams.value = e.target.value
                                    }
                                }
                            }
                            return options
                        })()
                    })

                    return container
                }
            }
        }
    }

    const getInputLayerGeoJSON = async (layer, {
        coverage='visible',
    }={}) => {
        if (coverage === 'visible') {
            return turf.clone(layer.toGeoJSON())
        } else {
            const storedData = turf.clone((await getFromGISDB(layer._indexedDBKey)).gisData)

            if (coverage === 'stored') {
                return storedData
            }

            if (coverage === 'selected') {
                return turf.featureCollection(storedData.features.filter(f => {
                    return (layer._selectedFeatures ?? []).includes(f.metadata.gsl_id)
                }))
            }
        }

        return turf.featureCollection([])
    }

    const tools = {
        vectorTransform: {
            title: 'Vector Transformation',
            tools: {
                dissolve: {
                    title: 'Dissolve features',
                    details: {
                        description: 'Dissolve features in a layer into multi-part features.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        let geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })

                        geojson.features = (() => {
                            const id = JSON.parse(inputLayer._indexedDBKey.split(';')[1].split('--')[0]).id
                            const features = {}

                            for (const i of ['MultiPoint', 'MultiLineString', 'MultiPolygon']) {
                                features[i] = {
                                    "type": "Feature",
                                    "geometry": {
                                        "type": i,
                                        "coordinates": []
                                    },
                                    "properties": {},
                                    "metadata": {dissolved: id}
                                }
                            }

                            geojson.features.forEach(f => {
                                const geomType = f.geometry.type
                                
                                if (geomType.startsWith('Multi')) {
                                    features[geomType].geometry.coordinates = [...features[geomType].geometry.coordinates, ...f.geometry.coordinates]
                                } else {
                                    features[`Multi${geomType}`].geometry.coordinates.push(f.geometry.coordinates)
                                }
                            })

                            return Object.values(features)
                        })()

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > dissolved`,
                            }
                        })

                        return layer
                    }
                },
                toBounds: {
                    title: 'Features to Bounding Geometry',
                    details: {
                        description: removeWhitespace(`
                            Convert feature geometries in a vector layer to their bounding geometries.
                            Based on Turf.js
                            <a href="https://turfjs.org/docs/api/envelope" target="_blank">envelope</a>, 
                            <a href="https://turfjs.org/docs/api/bbox" target="_blank">bbox</a>,
                            <a href="https://turfjs.org/docs/api/square" target="_blank">square</a>,
                            <a href="https://turfjs.org/docs/api/bboxPolygon" target="_blank">bboxPolygon</a> and
                            <a href="https://turfjs.org/docs/api/convex" target="_blank">convex</a> functions.
                        `),
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                        dissolve: templateFieldHandlers['dissolveFeatures'](),
                        method: {
                            required: true,
                            value: null,
                            createElement: ({parent, name, fieldParams}={}) => {
                                const container = customCreateElement({
                                    parent,
                                    className: 'input-group d-flex flex-nowrap',
                                })

                                const label = customCreateElement({
                                    parent: container,
                                    tag: 'span',
                                    innerText: 'Method',
                                    className: 'input-group-text fs-12',
                                })

                                const checkboxes = createCheckboxOptions({
                                    parent: container,
                                    name,
                                    type: 'radio',
                                    containerClass: 'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',
                                    options: (() => {
                                        const methods = {
                                            envelope: 'Envelope',
                                            square: 'Square',
                                            convex: 'Convex',
                                        }

                                        const options = {}
                                        for (const method in methods) {
                                            options[method] = {
                                                checked: false,
                                                label: methods[method],
                                                events: {click: (e) => fieldParams.value = e.target.value}
                                            }
                                        }
                                        return options
                                    })()
                                })

                                return container
                            }
                        },
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        let geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })
                        
                        const handler = (() => {
                            const method = params.method

                            if (Array('envelope', 'convex').includes(method)) {
                                return turf[method]
                            }

                            if (Array('square').includes(method)) {
                                return (d) => {
                                    const bbox = turf.bbox(d)
                                    const square = turf.square(bbox)
                                    return turf.bboxPolygon(square)
                                }
                            }
                        })()

                        if (params.dissolve) {
                            geojson = handler(geojson)
                        } else {
                            geojson.features = geojson.features.map(f => {
                                try {
                                    f.geometry = handler(f).geometry
                                    return f
                                } catch (error) {
                                    return f
                                }
                            })
                        }

                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > ${params.dissolve ? 'layer' : 'feature'} ${params.method}`,
                            }
                        })

                        return layer
                    }
                },
                toPoints: {
                    title: 'Features to Point/s',
                    details: {
                        description: 'Convert features in a vector layer to point feature/s. Based on Turf.js <a href="https://turfjs.org/docs/api/centerMedian" target="_blank">functions</a>.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                        dissolve: templateFieldHandlers['dissolveFeatures'](),
                        method: {
                            required: true,
                            value: null,
                            createElement: ({parent, name, fieldParams}={}) => {
                                const container = customCreateElement({
                                    parent,
                                    className: 'input-group d-flex flex-nowrap',
                                })

                                const label = customCreateElement({
                                    parent: container,
                                    tag: 'span',
                                    innerText: 'Method',
                                    className: 'input-group-text fs-12',
                                })

                                const checkboxes = createCheckboxOptions({
                                    parent: container,
                                    name,
                                    type: 'radio',
                                    containerClass: 'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',
                                    options: (() => {
                                        const methods = {
                                            center: 'Center',
                                            centerOfMass: 'Center of mass',
                                            centroid: 'Centroid',
                                            pointOnFeature: 'Point on feature',
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

                                return container
                            }
                        },
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })
                        
                        if (params.dissolve) {
                            geojson = turf[params.method](geojson)
                        } else {
                            geojson.features = geojson.features.map(f => {
                                f.geometry = turf[params.method](f).geometry
                                return f
                            })
                        }
                        
                        const layer = await getLeafletGeoJSONLayer({
                            geojson,
                            group,
                            pane: createCustomPane(map),
                            params: {
                                name: `${inputLayer._params.title} > ${params.dissolve ? 'layer' : 'feature'} ${params.method}`,
                            }
                        })

                        return layer
                    }
                },
                flatten: {
                    title: 'Flatten Multi-part Geometries',
                    details: {
                        description: 'Convert multi-part vector features in a layer into single-part features. Based on Turf.js <a href="https://turfjs.org/docs/api/flatten" target="_blank">flatten function</a>.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        const geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })

                        geojson.features = geojson.features.flatMap(f => {
                            const newFeatures = turf.flatten(f).features

                            for (const index in newFeatures) {
                                const feature = newFeatures[index]
                                const metadata = feature.metadata = feature.metadata ?? {}
                                
                                const prefix = `flatten_index`
                                let propKey = prefix
                                let count = 0
                                while (Object.keys(metadata).includes(propKey)) {
                                    count +=1
                                    propKey = `${prefix}_${count}`
                                }

                                metadata[propKey] = index
                                metadata[`flattened_feature${count ? `_${count}` : ''}`] = f.metadata.gsl_id

                                delete metadata.gsl_id
                            }

                            return newFeatures
                        })
                        
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
                        description: 'Convert self-intersecting polygon features in a layer into single-part features. Based on Turf.js <a href="https://turfjs.org/docs/api/unkinkPolygon" target="_blank">unkinkPolygon function</a>.',
                        inputs: 'vector layer',
                        outputs: 'vector layer',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                    },
                    handler: async (params) => {
                        const inputLayer = params.layer
                        let geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })

                        geojson.features = geojson.features.flatMap(f => {
                            const newFeatures = turf.unkinkPolygon(f).features

                            for (const index in newFeatures) {
                                const feature = newFeatures[index]
                                const metadata = feature.metadata = feature.metadata ?? {}
                                
                                const prefix = `unkink_index`
                                let propKey = prefix
                                let count = 0
                                while (Object.keys(metadata).includes(propKey)) {
                                    count +=1
                                    propKey = `${prefix}_${count}`
                                }

                                metadata[propKey] = index
                                metadata[`unkinked_feature${count ? `_${count}` : ''}`] = f.metadata.gsl_id

                                delete metadata.gsl_id
                            }

                            return newFeatures
                        })

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
        vectorFilter: {
            title: 'Vector Filtering',
            tools: {
                typeFilter: {
                    title: 'Filter by Geometry Type',
                    details: {
                        description: 'Extracts features with selected geomtry types from the input vector layer.',
                    },
                    fields: {
                        layer: templateFieldHandlers['vectorLayer'](),
                        coverage: templateFieldHandlers['coveredFeatures'](),
                        types: {
                            required: true,
                            value: null,
                            createElement: ({parent, name, fieldParams}={}) => {
                                const container = customCreateElement({
                                    parent,
                                    className: 'input-group d-flex flex-nowrap',
                                })

                                const label = customCreateElement({
                                    parent: container,
                                    tag: 'span',
                                    innerText: 'Geometry type',
                                    className: 'input-group-text fs-12 text-wrap text-start',
                                })

                                const field = createCheckboxOptions({
                                    parent: container,
                                    name,
                                    containerClass: 'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',
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
                        const geojson = await getInputLayerGeoJSON(inputLayer, {
                            coverage: params.coverage
                        })
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
        className: 'p-3 fs-12'
    })

    const searchField = customCreateElement({
        parent: searchContainer,
        tag: 'input',
        className: 'ps-0 border-0 rounded-0 box-shadow-none bg-transparent w-100 fs-12',
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
        className: 'fs-12 d-flex flex-column border-top mb-3'
    })
    

    const renderTools = ({keywords=[]}={}) => {
        toolsContainer.innerHTML = ''

        for (const set in tools) {
            const setParams = tools[set]
    
            const setContainer = customCreateElement({
                // parent: toolsContainer,
                id: `${toolsContainer.id}-${set}`,
                className: 'd-flex flex-column',
            })
    
            const setHeader = customCreateElement({
                parent: setContainer,
                className: 'd-flex flex-nowrap justify-content-between fw-bold p-2 border-bottom',
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
                id: `${setContainer.id}-accordion`,
                className: 'accordion d-flex flex-column rounded-0',
            })
    
            for (const tool in setParams.tools) {
                const toolParams = setParams.tools[tool]

                const toolString = `${toolParams.title} | ${setParams.title} | ${toolParams.details.description}`.toLowerCase()
                if (keywords.length && keywords.every(k => !toolString.includes(k.toLowerCase()))) continue
    
                const toolContainer = customCreateElement({
                    parent: setToolsContainer,
                    id: `${setContainer.id}-${tool}`,
                    className: 'accordion-item d-flex flex-column border-0 rounded-0',
                })
    
                const toolHead = customCreateElement({
                    parent: toolContainer,
                    className: 'accordion-header d-flex flex-nowrap justify-content-between p-2 ps-3 border-bottom',
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
                    className: 'accordion-collapse collapse',
                    attrs: {
                        'data-bs-parent': `#${setContainer.id}-accordion`
                    }
                })
    
                const toolCollapseContainer = customCreateElement({
                    parent: toolCollapse,
                    className: 'accordion-body d-flex flex-column gap-3 p-3 border-bottom'
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
                    fieldParams.createElement({
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
                            if (layer) {
                                group.addLayer(layer)
                            }
                        }
                    }
                })
    
                toggleToolBtns()
            }

            if (setToolsContainer.innerHTML !== '') {
                toolsContainer.appendChild(setContainer)
            }
        }

        if (toolsContainer.innerHTML === '') {
            customCreateElement({
                parent: toolsContainer,
                innerText: 'No matching tools found.',
                className: 'border-bottom p-3'
            })
        } 
    }

    renderTools()
}
