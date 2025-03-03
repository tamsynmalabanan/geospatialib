const constructMapPanels = (mapContainer, options={}) => {
    const panelsContainer = options.panelsContainer || mapContainer

    createOffcanvas(`${mapContainer.id}-panels`, options={
        toggleThemed: true,
        toggleIconClass: 'bi-layout-sidebar-inset-reverse',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'm-10 d-none d-lg-block',
        toggleParent: panelsContainer,
        showOffcanvas: getCookie('show_map_panels')
    })
}