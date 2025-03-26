const handlerLeafletRenderer =(map) => {
    map.on('layeradd', (e) => {
        console.log(map._customHandlers.getLayerGroup(e.layer))
    })
}