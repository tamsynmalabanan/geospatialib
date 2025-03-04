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
    const [tabs, content] = createAccordion({
        'Legend': {
            id: `${id}-legend`,
            active: true
        },
        'Query': {
            id: `${id}-query`,
        },
        'Toolbox': {
            id: `${id}-toolbox`,
        },
    }, {
    })

    offcanvas.querySelector('.offcanvas-nav').appendChild(tabs)

    return [toggle, offcanvas]
}