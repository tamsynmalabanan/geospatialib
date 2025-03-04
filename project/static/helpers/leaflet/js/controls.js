const handleLeafletZoombar = (map, include=true) => {
    if (!include) return map.removeControl(map.zoomControl)

    const container = map.zoomControl.getContainer()
    container.classList.add('border-0', 'shadow-lg')

    const buttonClass = {
        _zoomInButton: ['bi', 'bi-plus', 'rounded-top', 'pt-1', 'rounded-bottom-0'],
        _zoomOutButton: ['bi', 'bi-dash', 'rounded-bottom', 'rounded-top-0', 'pt-1'],
    }

    for (const buttonName in buttonClass) {
        const button = map.zoomControl[buttonName]
        button.innerHTML = ''
        button.classList.add(...buttonClass[buttonName])
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