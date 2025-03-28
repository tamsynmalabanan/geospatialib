const getPathFeatureLayers = (map) => {
    const pathLayers = []
    Object.values(map._ch.getLayerGroups()).forEach(group => {
        group.eachLayer(layer => {
            const type = getLeafletLayerType(layer)
            const layers = type === 'geojson' ? layer.getLayers() : type === 'feature' ? [layer] : []
            layers.forEach(l => {
                if (!pathLayers.includes(l)) pathLayers.push(l)
            }) 
        })
    })
    return pathLayers
}

const handlerLeafletRenderer =(map) => {
    let timeout

    map.on('layeradd layerremove', () => {
        clearTimeout(timeout)
        setTimeout(() => {
            const pathFeatureLayers = getPathFeatureLayers(map)
            console.log(pathFeatureLayers)
        }, 100);
    })

}