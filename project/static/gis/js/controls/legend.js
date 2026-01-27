class LegendControl {
    constructor(options={}) {
    }

    createLegendContainer() {
        const container = this.legendContainer =  customCreateElement({
            parent: this._container,
            className: 'd-none py-2 px-3',
        })

        const content = customCreateElement({
            parent:container,
            className: 'd-flex flex-column gap-3'
        })

        const header = customCreateElement({
            parent: content,
            className: 'd-flex justify-content-between align-items-center'
        })

        const title = customCreateElement({
            parent: header,
            className: 'fs-14 fw-bold me-5',
            innerText: 'Legend'
        })

        const options = customCreateElement({
            parent: header,
            className: 'd-flex flex-nowrap gap-3 ms-5',
        })

        
        const menuToggle = customCreateElement({
            parent: options,
            className: 'bi bi-list h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => menuContainer.classList.toggle('d-none',)
            }
        })
        
        const legendToggle = customCreateElement({
            parent: options,
            className: 'bi bi-stack h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => layerLegendContainer.classList.toggle('d-none',)
            }
        })

        const collapse = customCreateElement({
            parent: options,
            className: 'bi bi-chevron-up h-auto w-auto',
            tag: 'button',
            events: {
                click: (e) => {
                    container.classList.add('d-none')
                    this.control.classList.remove('d-none')
                }
            }
        })

        const menuContainer = customCreateElement({
            parent: content,
        })

        const menu = customCreateElement({
            parent:menuContainer,
            className: 'd-flex flex-wrap',
            innerText: 'menu'
        })

        const layerLegendContainer = customCreateElement({
            parent: content,
        })

        const layerLegend = customCreateElement({
            parent: layerLegendContainer,
            innerText: 'legend'
        })

        return container
    }

    onAdd(map) {
        this.map = map
        this._container = customCreateElement({
        className:'maplibregl-ctrl maplibregl-ctrl-group'
        })

        const button = this.control = customCreateElement({
            tag:'button',
            parent: this._container,
            className: 'fs-16',
            attrs: {
                type: 'button',
                title: 'Show legend'
            },
            innerHTML: `<i class="bi bi-stack"></i>`,
            events: {
                click: (e) => {
                    button.classList.add('d-none')
                    this.legendContainer.classList.remove('d-none')
                }
            }
        })

        this.createLegendContainer()

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}