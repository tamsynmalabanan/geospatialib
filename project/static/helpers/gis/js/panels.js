const createMapPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    const [toggle, offcanvas] = createOffcanvas(id, {
        themed: true,
        toggleIconClass: 'bi-info-circle',
        toggleLabelText: 'Geopanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === 'true',
        offcanvasClass: 'offcanvas-end',
        offcanvasToggleIcon: 'bi-layout-sidebar-inset-reverse',
        titleClass: 'h6'
    })

    const [tabs, accordion] = createAccordion(`${id}-accordion`, {
        'legend': {
            label: `Legend`,
        },
        'query': {
            label: `Query`,
            active: true
        },
        'toolbox': {
            label: `Toolbox`,
        },
    }, {themed:true})

    offcanvas.querySelector('.offcanvas-nav').appendChild(tabs)
    offcanvas.querySelector('.offcanvas-body').appendChild(accordion)

    return [toggle, offcanvas]
}