const handlerLeafletRenderer =(map) => {
    map._currentRenderer = 'svg'
    
    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            if (e.layer instanceof L.GeoJSON) {
                const threshold = 100
                const count = map.getContainer().querySelectorAll('path').length
                if ((count > threshold && map._currentRenderer !== 'canvas') || (count <= threshold && map._currentRenderer !== 'svg')) {
                    const isCanvas = map._currentRenderer === 'canvas'
                    map._currentRenderer = isCanvas ? 'svg' : 'canvas'
                }
                Object.values(map._ch.getLayerGroups()).forEach(group => {
                    console.log(group._ch.getAllLayers())
                    group._ch.getAllLayers().forEach(layer => {
                        // console.log(layer)
                        // Object.keys(layer._renderers).forEach(k => {
                        //     layer._renderers[k]._container
                        //     .classList.toggle('d-none', k !== map._currentRenderer)
                        // })
                
                        if (map._currentRenderer === 'svg' && layer.options.renderer instanceof L.SVG) return
                        if (map._currentRenderer === 'canvas' && layer.options.renderer instanceof L.Canvas) return

                        layer.fire('rendererupdated', {renderer:map._currentRenderer})
                    })
                })
            }
        }, 100);
    })
}