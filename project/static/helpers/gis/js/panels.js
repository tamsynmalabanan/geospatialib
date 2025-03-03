const constructMapPanels = (container) => {
    createOffcanvas(`${container.id}-panels`, options={
        toggleParent: container
    })
}