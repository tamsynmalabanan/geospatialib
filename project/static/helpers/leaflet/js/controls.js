const handleLeafletZoombar = (map, include=true) => {
    if (!include) return map.removeControl(map.zoomControl)

    const container = map.zoomControl.getContainer()
    container.classList.add('border-0', 'shadow-lg')

    const defaultClass = ['border-0', 'd-flex', 'justify-content-center', 'align-items-center']
    const buttonClass = {
        _zoomInButton: {
            icon: createIcon({className: 'bi bi-plus'}),
            class: defaultClass.concat(['rounded-top', 'rounded-bottom-0'])
        },
        _zoomOutButton: {
            icon: createIcon({className: 'bi bi-dash'}),
            class: defaultClass.concat(['rounded-bottom', 'rounded-top-0'])
        },
    }

    for (const buttonName in buttonClass) {
        const properties = buttonClass[buttonName]
        const button = map.zoomControl[buttonName]
        button.innerHTML = properties.icon.outerHTML
        button.classList.add(...properties.class)
    }
}

const handleLeafletScaleBar = (map, include=true) => {
    if (!include) return

    L.control.scale({ position: 'bottomright' }).addTo(map)
}

const leafletControls = {
    zoom: handleLeafletZoombar,
    scale: handleLeafletScaleBar,
}


const handleLeafletMapControls = (map) => {
    const container = map.getContainer()
    const dataset = container.parentElement.dataset
    const includedControls = dataset.mapControlsIncluded
    const excludedControls = dataset.mapControlsExcluded

    Object.keys(leafletControls).forEach(controlName => {
        const excluded = excludedControls && (excludedControls.includes(controlName) || excludedControls === 'all')
        const included = !includedControls || includedControls.includes(controlName) || includedControls === 'all'
        leafletControls[controlName](map, included && !excluded)
    })

    applyThemeToLeafletControls(container)
    toggleMapInteractivity(map)
}

const applyThemeToLeafletControls = (container) => {
    addClassListToSelection(
        container, 
        removeWhitespace(`
            .leaflet-bar a, 
            .leaflet-control a, 
            .leaflet-control-attribution,
            .leaflet-control-scale-line,
        `).trim(), 
        [`text-bg-${getPreferredTheme()}`, 'text-reset']
    )
}

const toggleMapInteractivity = (map) => {
    map.getContainer().querySelectorAll('.leaflet-control').forEach(control => {
        Array.from(control.children).forEach(child => {
            Array('mouseover', 'touchstart', 'touchmove', 'wheel').forEach(trigger => {
                child.addEventListener(trigger, (e) => {
                    disableMapInteractivity(map)
                })
            })    
    
            Array('mouseout', 'touchend').forEach(trigger => {
                child.addEventListener(trigger, (e) => {
                    enableMapInteractivity(map)
                })
            })
        })
    })
}