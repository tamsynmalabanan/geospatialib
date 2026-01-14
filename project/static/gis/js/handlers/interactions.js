class InteractionsHandler {
    constructor(map) {
        this.map = map
        this.config = {
            tooltip: {
                object: null,
                timeout: null,
                show: true,
            },
            nameProperties: [
                'display_name', 
                'name', 
                'title', 
                'id'
            ],

        }
        
        this.map.on('mousemove', (e) => {
            this.config.tooltip.object?.remove()
            this.config.tooltip.object = null
            
            clearTimeout(this.config.tooltip.timeout)
            this.config.tooltip.timeout = setTimeout(async () => {
                this.createTooltip(e)
            }, 100)
        })
    }

    async getCanvasData({
        bbox, point, event,
        layers, filter,
        queryRasters=false,
    }) {
        const pos = bbox ?? point ?? event?.point
        if (!pos) return []

        let features = this.map.queryRenderedFeatures(pos, {layers, filter})

        if (queryRasters) {
            console.log('update features with features from rasters i.e. wms, dems, etc.')

            const sources = {}
 
            this.map.getStyle().layers.forEach(l => {
                if (layers?.length && !layers.includes(l.id)) return
                if (l.source in sources) return

                const source = this.map.getStyle().sources[l.source]
                if (Array('vector', 'geojson').includes(source.type)) return
                sources[l.source] = source
            })

            for (const source of Object.values(sources)) {
                const metadata = source.metadata
                const params = metadata?.params

                let refFeature
                if (bbox) {
                    const [w,n] = Object.values(this.map.unproject(bbox[0]))
                    const [e,s] = Object.values(this.map.unproject(bbox[1]))
                    refFeature = turf.bboxPolygon([w,s,e,n])
                } else {
                    refFeature = turf.point(Object.values(point ? this.map.unproject(point) : event?.lngLat))
                }

                if (params?.bbox && !turf.booleanIntersects(refFeature, turf.bboxPolygon(params?.bbox))) continue

                let data

                if (Array('wms').includes(params?.type)) {
                    data = await fetchWMSData(params, {
                        style: metadata.style,
                        event,
                    })
                }
                
                if (data?.features?.length) {
                    await normalizeGeoJSON(data)
                    features = [
                        ...features,
                        ...(data.features ?? [])
                    ]
                }
            }
        }

        if (features?.length && features.length > 1) {
            const uniqueFeatures = []
            features.forEach(f1 => {
                if (!uniqueFeatures.find(f2 => {
                    if (f1.source !== f2.source) return false
                    if (f1.layer?.metadata?.name !== f2.layer?.metadata?.name) return false
                    if (f1.layer?.metadata?.group !== f2.layer?.metadata?.group) return false
                    if (!featuresAreSimilar(f1, f2)) return false
                    return true
                })) uniqueFeatures.push(f1)
            })
            features = uniqueFeatures
        }

        return features
    }

    getDefaultFeatureLabel(f) {
        return f.properties[
            this.config.nameProperties
            .find(i => Object.keys(f.properties).find(j => j.includes(i))) 
            ?? Object.keys(f.properties).pop()
        ]  
    }

    getTooltipContent(f) {
        const tooltip = f.layer?.metadata?.tooltip ?? {}

        return Array(
            tooltip.prefix ?? '',
            tooltip.properties?.map(p => String(f.properties?.[p]) ?? 'null').join(tooltip.delimiter ?? '') ?? '',
            tooltip.suffix ?? '',
        ).join('').trim() || this.getDefaultFeatureLabel(f)
    }

    async createTooltip(e) {
        const map = this.map
        
        if (!this.config.tooltip.show) return

        const validVectorLayers = map.getStyle().layers.filter(l => {
            const source = map.getStyle().sources[l.source]
            return (
                Array('geojson', 'vector').includes(source?.type)
                && l.metadata?.tooltip?.active
                && source?.data?.features?.length
            )
        })
        if (!validVectorLayers.length) return

        const features = await this.getCanvasData({
            event: e, 
            layers: validVectorLayers.map(l => l.id)
        })
        if (!features?.length) return

        let label
        for (const f of features) {
            label = this.getTooltipContent(f)
            if (label) break
        }

        if (!label) return

        const popup = this.config.tooltip.object = new maplibregl.Popup({closeButton: false})
        .setLngLat(e.lngLat)
        .setHTML(`<span class="text-break">${label}</span>`)
        .addTo(map)

        const theme = getPreferredTheme()
        
        const popupContent = popup._container.querySelector('.maplibregl-popup-content')
        popupContent.classList.add('p-2', `bg-${theme}-50`)
        
        const container = popupContent.firstChild
        container.classList.add(`text-${theme === 'light' ? 'dark' : 'light'}`)
        
        this.configPopupPointer(popup)
    }

    configPopupPointer(popup) {
        const popupContainer = popup._container
        const popupContent = popupContainer.querySelector('.maplibregl-popup-content')
        const popupTooltip = popupContainer.querySelector('.maplibregl-popup-tip')
        
        const handler = () => {
            popupTooltip.removeAttribute('style')
            
            const bgColor = window.getComputedStyle(popupContent).backgroundColor
            const style = window.getComputedStyle(popupTooltip)
 
            Array('Top', 'Bottom', 'Left', 'Right').forEach(pos => {
                if (style.getPropertyValue(`border-${pos.toLowerCase()}-color`) === `rgb(255, 255, 255)`) {
                    popupTooltip.style[`border${pos}Color`] = bgColor
                }
            })
        }

        handler()
        elementMutationObserver(popupContainer, handler, {attributeFilter: ['class']})
    }
}