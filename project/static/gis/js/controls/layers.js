class LayersControl {
    constructor(options={}) {
    }

    normalizeLayerParams(params) {
        if (!params.type) {
            params.type = params.format
        }
        
        if (!params.bbox) {
            params.bbox = [-180, -90, 180, 90]
        }
        
        if (!params.crs) {
            params.crs = 'EPSG:4326'
        }
        
        if (!params.title) {
            params.title = params.name
        }

        if (!params.style || !(params.style in params.styles)) {
            params.style = Object.keys(params.styles)[0]
        }

        if (!params.attribution && params.url) {
            const domain = (new URL(params.url)).host.split('.').slice(-2).join('.')
            params.attribution = `Data from <a class='text-decoration-none text-reset text-muted' href="https://www.${domain}/" target="_blank">${domain}</a>`
        }
        
        return params
    }

    addRasterLayer (source, params) {
        const map = this.map
        
        const name = generateRandomString()
        const id = `${source.id}-${name}`
        const beforeId = map.sourcesHandler.getBeforeId(id)

        map.addLayer({
            id,
            type: "raster",
            source: source.id,
            metadata: {
                ...source.metadata,
                params: {
                    ...source.metadata.params,
                    ...params,
                },
                name,
                popup: {
                    active: params.type === 'wms' ? true : false,
                }
            }
        }, beforeId)   

        return map.getLayer(id)
    }

    addLayerHandler() {
        const map = this.map

        map.getContainer().addEventListener('addLayer', async (e) => {
            const params = this.normalizeLayerParams(e.detail.layer)
            
            const sourceId = await hashJSON(params) 
            
            let source

            if (params.type === 'xyz') {
                source = map.sourcesHandler.getXYZSource(sourceId, params)
                this.addRasterLayer(source, params)
            }
            
            if (params.type === 'wms') {
                source = map.sourcesHandler.getWMSSource(sourceId, params)
                this.addRasterLayer(source, params)
            }
        })
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
                title: 'Add layers',
                'data-bs-toggle': 'modal',
                'data-bs-target': '#addLayersModal',

            },
            style: {
                'borderRadius': '4px',
            },
            innerHTML: `<i class="bi bi-plus-lg"></i>`,
            events: {
                click: (e) => {
                    document.querySelector(`#addLayersModal`)
                    ._mapContainer = this.map.getContainer()
                }
            }
        })

        this.addLayerHandler()

        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this.map = undefined;
    }
}