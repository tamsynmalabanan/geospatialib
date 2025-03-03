const constructMapPanels = (container) => {
    createOffcanvas(`${container.id}-panels`, options={
        toggleClass: 'z-2'
        toggleParent: container
    })
}