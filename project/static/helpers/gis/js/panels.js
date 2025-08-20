const findLayersPanels = (container, {} = {}) => {
    const id = `${container.id}-panels`
    const [toggle, offcanvas] = createOffcanvas(id, {
        themed: true,
        toggleiconSpecs: 'bi-info-circle',
        toggleLabelText: 'Geopanel',
        toggleLabelClass: 'd-none d-md-block',
        show: getCookie(`show_#${id}`) === 'true',
        offcanvasClass: 'offcanvas-end',
        offcanvasToggleIcon: 'bi-layout-sidebar-inset-reverse',
        titleClass: 'h6',
        toggleBtns: [
            createButton({
                className: 'bi bi-stars border-0 bg-transparent fs-16 p-0 ms-3',
                attrs: {
                    type:'button', 
                    title:'Find layers',
                    'data-bs-toggle':"modal",
                    'data-bs-target':"#findLayersModal",
                },
                
            }),
            createButton({
                className: 'bi bi-plus-square border-0 bg-transparent fs-16 p-0 text-muted ms-3',
                attrs: {
                    type:'button', 
                    title:'Add layers',
                    'data-bs-toggle':"modal",
                    'data-bs-target':"#addLayersModal",
                },
                
            }),
            createButton({
                className: 'bi bi-save border-0 bg-transparent fs-16 p-0 text-muted ms-3',
                attrs: {
                    type:'button', 
                    title:'Export layers',
                    'data-bs-toggle':"modal",
                    'data-bs-target':"#exportLayersModal",
                },
            }),
        ]
    })

    offcanvas.style.minWidth = '200px'

    const [tabs, accordion] = createAccordion(`${id}-accordion`, {
        'legend': {
            label: `Legend`,
            // active: true
        },
        'style': {
            label: `Properties`,
        },
        'query': {
            label: `Query`,
        },
        'toolbox': {
            label: `Toolbox`,
            active: true,
        },
    }, {themed:true})

    offcanvas.querySelector('.offcanvas-nav').appendChild(tabs)
    offcanvas.querySelector('.offcanvas-body').appendChild(accordion)

    return [toggle, offcanvas]
}