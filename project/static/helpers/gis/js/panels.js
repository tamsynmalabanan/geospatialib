const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    return createOffcanvas(id, {
        toggleClass: 'm-10',
        themed: true,
        toggleIconClass: 'bi-layout-sidebar-inset-reverse',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === true,
        offcanvasClass: 'offcanvas-end col-lg'
    })
}