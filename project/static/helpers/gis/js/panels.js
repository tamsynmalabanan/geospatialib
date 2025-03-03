const constructMapPanels = (mapContainer, {} = {}) => {
    return createOffcanvas(`${mapContainer.id}-panels`, options={
        toggleClass: 'm-10',
        themed: true,
        toggleIconClass: 'bi-layout-sidebar-inset-reverse',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie('show_map_panels')
    })
}