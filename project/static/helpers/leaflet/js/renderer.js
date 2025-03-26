const handlerLeafletRenderer =(map) => {
    map._currentRenderer = 'svg'

    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const count = map.getContainer().querySelectorAll('path').length
            if ((count > 1000 && map._currentRenderer !== 'canvas') || (count <= 1000 && map._currentRenderer !== 'svg')) {
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