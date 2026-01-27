class LayersControl {
    constructor(options={}) {
    }

    onAdd(map) {
        this.map = map
        this._container = customCreateElement({
        className:'maplibregl-ctrl maplibregl-ctrl-group'
        })

        const button = customCreateElement({
            tag:'button',
            parent: this._container,
            className: 'fs-16 text-bg-success',
            attrs: {
                type: 'button',
                title: 'Add layers'
            },
            style: {
                'borderRadius': '4px',
            },
            innerHTML: `<i class="bi bi-plus-lg"></i>`,
            events: {
                click: (e) => {
                }
            }
        })

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}