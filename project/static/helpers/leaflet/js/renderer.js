const handlerLeafletRenderer =(map) => {
    map.on('layeradd layerremove', (e) => {
        console.log(map.getContainer().querySelectorAll('path').length)
    })
}