const handlerLeafletRenderer =(map) => {
    map._currentRenderer = 'svg'

    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            if (e.layer instanceof L.GeoJSON) {
                console.log(e.layer)
                const threshold = 100
                const count = map.getContainer().querySelectorAll('path').length
                if ((count > threshold && map._currentRenderer !== 'canvas') || (count <= threshold && map._currentRenderer !== 'svg')) {
                    map._currentRenderer = map._currentRenderer === 'canvas' ? 'svg' : 'canvas'
                    Object.values(map._ch.getLayerGroups()).forEach(group => {
                        group._ch.getAllLayers().forEach(layer => {
                            if (map._currentRenderer === 'svg' && layer.options.renderer instanceof L.SVG) return
                            if (map._currentRenderer === 'canvas' && layer.options.renderer instanceof L.Canvas) return
                            layer.fire('rendererupdated', {renderer:map._currentRenderer})
                        })
                    })
                }
            }
        }, 100);
    })
}