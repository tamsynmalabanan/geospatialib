const leafletControls = {

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
    toggleMapInteractivity(container)
}

const applyThemeToLeafletControls = (container) => {
    addClassListToSelection(
        container, 
        '.leaflet-bar a, .leaflet-control, .leaflet-control a', 
        [`text-bg-${getPreferredTheme()}`, 'text-reset']
    )
}

const toggleMapInteractivity = (container) => {
    container.querySelectorAll('.leaflet-control').forEach(control => {
        Array('mouseover', 'touchstart', 'touchmove', 'wheel').forEach(trigger => {
            control.addEventListener(trigger, (e) => {
                disableMapInteractivity(map)
            })
        })    

        Array('mouseout', 'touchend').forEach(trigger => {
            control.addEventListener(trigger, (e) => {
                enableMapInteractivity(map)
            })
        })
    })
}