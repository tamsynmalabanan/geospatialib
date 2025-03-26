const handlerLeafletRenderer =(map) => {
    map._currentRenderer = 'svg'

    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const count = map.getContainer().querySelectorAll('path').length
            map._currentRenderer = count > 1000 ? 'canvas' : 'svg'
            map.fire('rendererupdated')
        }, 100);
    })
}