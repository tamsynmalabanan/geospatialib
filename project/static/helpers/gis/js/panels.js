const constructMapPanels = (mapContainer, options={}) => {
    const panelsContainer = options.panelsContainer || mapContainer

    createOffcanvas(`${mapContainer.id}-panels`, options={
        toggleClass: 'm-10',
        toggleThemed: true,
        toggleIconClass: 'bi-layout-sidebar-inset-reverse',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-lg-block',
        toggleParent: panelsContainer,
        showOffcanvas: getCookie('show_map_panels')
    })
}