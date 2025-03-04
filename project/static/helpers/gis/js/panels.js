const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    const [toggle, body] = createOffcanvas(id, {
        themed: true,
        toggleIconClass: 'bi-info-circle',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === 'true',
        offcanvasClass: 'offcanvas-end rounded',
        titleClass: 'h6'
    })

    // create accordion, empty, handle each panel in control.js legend, query, anylists tools

    return [toggle, body]
}