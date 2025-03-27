const handlerLeafletRenderer =(map) => {
    const objMap = new Map()
    
    let timeout
    map.on('layeradd layerremove', (e) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            console.log(e)

            let featureLayers = []
            const layerGroups = Object.values(map._ch.getLayerGroups())
            layerGroups.forEach(g => g.eachLayer(l => {
                const feature = l.feature
                const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
                if (feature && !isPoint) featureLayers.push(l)
            }))
            console.log(featureLayers.length)
        }, 1000);
    })
}