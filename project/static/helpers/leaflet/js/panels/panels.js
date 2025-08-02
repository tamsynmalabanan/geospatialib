const createLeafletMapPanel = (map, parent, name, {
    statusBar = false,
    spinnerRemark = '',
    clearLayersHandler,
    toolHandler,
} = {}) => {
    const template = {}

    const mapContainer = map.getContainer()
    const baseId = `${mapContainer.id}-panels-${name}`

    const toolbar = document.createElement('div')
    toolbar.id = `${baseId}-toolbar`
    toolbar.className = 'd-flex px-3 py-2 flex-wrap'
    parent.appendChild(toolbar)
    template.toolbar = toolbar
    
    const layers = document.createElement('div')
    layers.id = `${baseId}-layers`
    layers.className = `flex-grow-1 overflow-auto p-3 d-none border-top rounded-bottom text-bg-${getPreferredTheme()} d-flex flex-column gap-2`
    layers.style.minHeight = '90px'
    parent.appendChild(layers)
    template.layers = layers
    
    if (statusBar) {
        const status = document.createElement('div')
        status.id = `${baseId}-status`
        status.className = 'd-flex flex-column'
        parent.appendChild(status)
        template.status = status
        
        const spinner = document.createElement('div')
        spinner.id = `${status.id}-spinner`
        spinner.className = 'p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center justify-content-end'
        status.appendChild(spinner)
        template.spinner = spinner

        const spinnerIcon = document.createElement('div')
        spinnerIcon.className = 'spinner-border spinner-border-sm'
        spinnerIcon.setAttribute('role', 'status')
        spinner.appendChild(spinnerIcon)

        const spinnerRemarkDiv = customCreateElement({
            parent: spinner,
            innerText: spinnerRemark,
        })
    
        const error = document.createElement('div')
        error.id = `${status.id}-error`
        error.className = 'p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center'
        status.appendChild(error)
        template.error = error

        const errorIcon = document.createElement('div')
        errorIcon.className = 'bi bi-exclamation-triangle-fill'
        error.appendChild(errorIcon)
        
        const errorRemarkDiv = document.createElement('div')
        error.appendChild(errorRemarkDiv)    
    }

    template.clearLayers = async (tools) => {
        layers.innerHTML = ''
        layers.classList.add('d-none')

        await clearLayersHandler?.()
            
        for (const tool in tools) {
            const data = tools[tool]
            if (data.disabled) {
                toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled = true
            }
        }    

        if (statusBar) {
            parent.querySelector(`#${baseId}-status-spinner`).classList.add('d-none')
            parent.querySelector(`#${baseId}-status-error`).classList.add('d-none')
        }
    }

    template.toolsHandler = (tools) => {
        Object.keys(tools).forEach(toolId => {
            const data = tools[toolId]
            if (data.altShortcut && data.title) data.title = `${data.title} (alt+${data.altShortcut})` 
    
            const tag = data.tag || 'button'
            const element = tag !== 'button' ?
            customCreateElement({...data, tag}) :
            createButton({...data,
                id: `${toolbar.id}-${toolId}`,
                className: data.className ?? `btn-sm btn-${getPreferredTheme()}`,
                events: {
                    click: async (event) => {
                        L.DomEvent.stopPropagation(event);
                        L.DomEvent.preventDefault(event);        
                        
                        const btn = event.target
                        const [panelName, currentMode] = map._panelMode || []
                        const activate = currentMode !== toolId
                        const mapClickHandler = activate ? data.mapClickHandler : null 
                        const btnClickHandler = activate ? data.btnClickHandler : null     
                        const skipToolHandler = !toolHandler || data.toolHandler === false
    
                        if (activate && currentMode) {
                            document.querySelector(`#${mapContainer.id}-panels-${panelName}-toolbar-${currentMode}`).click()
                        }
                        
                        if (!skipToolHandler) {
                            btn.classList.toggle('btn-primary', mapClickHandler)
                            btn.classList.toggle(`btn-${getPreferredTheme()}`, !mapClickHandler)
                        }

                        mapContainer.style.cursor = mapClickHandler ? 'pointer' : ''
                        map._panelMode = [name, mapClickHandler ? toolId : undefined]
        
                        if (mapClickHandler) {
                            const panelMapClickHandler = async (e) => {
                                if (isLeafletControlElement(e.originalEvent.target) || map._panelMode[1] !== toolId) return
        
                                map.off('click', panelMapClickHandler)
                                enableLeafletLayerClick(map)
                                
                                skipToolHandler ? await mapClickHandler() : await toolHandler(e, mapClickHandler)
                                if (btn.classList.contains('btn-primary')) btn.click()
                            }
                            
                            disableLeafletLayerClick(map)
                            map.on('click', panelMapClickHandler)
                        } else {
                            enableLeafletLayerClick(map)
                            map._events.click = map._events.click?.filter(handler => {
                                return handler.fn.name !== 'panelMapClickHandler'
                            })
                        }
                        
                        if (btnClickHandler) {
                            skipToolHandler ? await btnClickHandler(event) : await toolHandler(event, btnClickHandler)
                        }
                    }
                }
            })
    
            if (data.altShortcut) document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === data.altShortcut) {
                    L.DomEvent.preventDefault(e)
                    element.click()
                }
            })        
            
            toolbar.appendChild(element)
        })
    
        return tools
    }

    return template
}

const handleLeafletMapPanels = async (map) => {
    const mapContainer = map.getContainer()
    if (mapContainer.parentElement.dataset.mapPanels !== 'true') return
    
    const control = L.control({position:'topright'})
    control.onAdd = (map) => {
        const panel = L.DomUtil.create('div', 'map-panel')
        panel.classList.add('d-flex', 'flex-column')
        
        const [toggle, body] = createMapPanels(mapContainer)
        panel.appendChild(toggle)
        panel.appendChild(body)
        
        handleLeafletQueryPanel(map, body.querySelector(`#${body.id}-accordion-query .accordion-body`))
        handleLeafletLegendPanel(map, body.querySelector(`#${body.id}-accordion-legend .accordion-body`))
        handleLeafletStylePanel(map, body.querySelector(`#${body.id}-accordion-style .accordion-body`))
        
        return panel
    }
    control.addTo(map)
}