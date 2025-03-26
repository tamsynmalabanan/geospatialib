const handlerLeafletRenderer =(map) => {
    map.on('layeradd', (e) => {
        console.log(map.getContainer().querySelectorAll('path').length)
    })
}