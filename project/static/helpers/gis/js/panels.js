const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    const [toggle, offcanvas] = createOffcanvas(id, {
        themed: true,
        toggleIconClass: 'bi-info-circle',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === 'true',
        offcanvasClass: 'offcanvas-end rounded',
        offcanvasToggleIcon: 'bi-layout-sidebar-inset-reverse',
        titleClass: 'h6'
    })
    // create accordion, empty, handle each panel in control.js legend, query, anylists tools
    createAccordionNavTabs({
        'Legend': {
            active: true
        },
        'Query': {
            // active: false
        },
        'Toolbox': {
            // active: false
        },
    }, {
        parent: offcanvas.querySelector('.offcanvas-nav'),
    })

    return [toggle, offcanvas]
}