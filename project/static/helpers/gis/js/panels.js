const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    return createOffcanvas(id, {
        themed: true,
        toggleIconClass: 'bi-layout-sidebar-inset-reverse',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === true,
        offcanvasClass: 'offcanvas-end',
        titleClass: 'h6'
    })
}