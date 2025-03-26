const handlerLeafletRenderer =(map) => {
    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            console.log(map.getContainer().querySelectorAll('path').length)
        }, 100);
    })
}