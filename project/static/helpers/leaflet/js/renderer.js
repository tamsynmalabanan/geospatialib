const getPathFeatureLayers = (map) => {
    const pathLayers = []
    map._ch.getLayerGroups().forEach(group => {
        group.eachLayer(layer => {
            const type = getLeafletLayerType(layer)
            const layers = type === 'geojson' ? layer.getLayers() : type === 'feature' ? [layer] : []
            layers.forEach(l => {
                // if (!pathLayers)
            }) 
        })
    })
}

const handlerLeafletRenderer =(map) => {
    let timeout

    map.on('layeradd layerremove', () => {
        clearTimeout(timeout)
        setTimeout(() => {
            
        }, 100);
    })

}