const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    
    let timeout
    map.on('layeradd layerremove', (e) => {
        const layer = e.layer
        const feature = layer.feature
        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
        if (feature && !isPoint) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                console.log(e)
    
                let featureLayers = []
                const layerGroups = Object.values(map._ch.getLayerGroups())
                console.log(layerGroups)
                layerGroups.forEach(g => g.eachLayer(l => {
                    console.log(l)
                    const feature = l.feature
                    const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
                    if (feature && !isPoint) featureLayers.push(l)
                }))
                console.log(featureLayers.length)
            }, 100);
        }
    })
}