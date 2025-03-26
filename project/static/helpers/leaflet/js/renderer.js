const handlerLeafletRenderer =(map) => {
    map._currentRenderer = 'svg'

    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const threshold = 100
            const count = map.getContainer().querySelectorAll('path').length
            if ((count > threshold && map._currentRenderer !== 'canvas') || (count <= threshold && map._currentRenderer !== 'svg')) {
                map._currentRenderer = map._currentRenderer === 'canvas' ? 'svg' : 'canvas'
                Object.values(map._ch.getLayerGroups()).forEach(g => {
                    g._ch.getAllLayers().forEach(l => {
                        l.fire('rendererupdated', {renderer:map._currentRenderer})
                    })
                })
            }
        }, 100);
    })
}