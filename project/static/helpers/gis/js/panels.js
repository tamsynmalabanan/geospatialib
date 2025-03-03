const constructMapPanels = (mapContainer, options={}) => {
    const panelsContainer = options.panelsContainer || mapContainer

    createOffcanvas(`${mapContainer.id}-panels`, options={
        toggleClass: 'z-2',
        toggleParent: container,
    })
}