const handleLeafletZoombar = (map, include=true) => {
    if (!include) return map.removeControl(map.zoomControl)

    // const buttons = {
    //     _zoomInButton: ['bi', 'bi-plus', 'rounded-top', 'pt-1', 'rounded-bottom-0'],
    //     _zoomOutButton: ['bi', 'bi-dash', 'rounded-bottom', 'rounded-top-0'],
    // }

    const buttons = {
        _zoomInButton: {
            innerHTML: createIcon({className:'bi bi-plus'}).outerHTML
        },
        _zoomOutButton: {
            innerHTML: createIcon({className:'bi bi-dash'}).outerHTML
        },
    }

    for (const buttonName in buttons) {
        const properties = buttons[buttonName]
        const button = map.zoomControl[buttonName]
        button.innerHTML = properties.innerHTML
        // buttons[buttonName].forEach(className => {
        //     button.classList.add(className)
        // });
    }
}

const leafletControls = {
    zoom: handleLeafletZoombar,
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
        '.leaflet-bar a, .leaflet-control a, .leaflet-control-attribution', 
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