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
    
                const featureLayers = []
                const layerGroups = Object.values(map._ch.getLayerGroups())
                layerGroups.forEach(g => {
                    console.log(g)
                    g.eachLayer(l => {
                        const feature = l.feature
                        const isPoint = feature && feature.geometry.type.toLowerCase().endsWith('point')
                        if (feature && !isPoint) featureLayers.push(l)
                    })
                    console.log(featureLayers)
                })
                console.log(featureLayers.length)
            }, 1000);
        }
    })
}