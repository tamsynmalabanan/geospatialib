const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    const [toggle, offcanvas] = createOffcanvas(id, {
        themed: true,
        toggleIconClass: 'bi-info-circle',
        toggleLabelText: 'GeoPanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === 'true',
        offcanvasClass: 'offcanvas-end rounded',
        titleClass: 'h6'
    })
    console.log(offcanvas.querySelector('offcanvas-nav'))
    // create accordion, empty, handle each panel in control.js legend, query, anylists tools
    createNavTabs({
        'Legend': {
            active: true
        },
        'Query': {
            active: false
        },
        'Analysis': {
            active: false
        },
    }, {
        parent: offcanvas.querySelector('offcanvas-nav'),
    })

    return [toggle, offcanvas]
}