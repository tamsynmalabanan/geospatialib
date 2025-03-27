const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    
    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const featureLayers = []
            const layerGroups = Object.values(map._ch.getLayerGroups())
            layerGroups.forEach(g => g.eachLayer(l => {
                if (l.feature) featureLayers.push(l)
            }))
            console.log(featureLayers.length)
        }, 100);
    })
}