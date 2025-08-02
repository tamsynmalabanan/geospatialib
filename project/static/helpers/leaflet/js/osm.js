const addOverpassDataToLeafletMap = async ({
    map,
    query,
    queryGeom,
    zoom,
    tags,
    types,
} = {}) => {
    if (!query && !queryGeom) return

    const geojson = await fetchOverpass(types, tags, {queryGeom, zoom, query})
    if (!geojson || !geojson.features?.length) return    
    
    const group = map._layerGroups.local

    const layer = await getLeafletGeoJSONLayer({
        geojson,
        group,
        pane: createCustomPane(map),
        params: {name: `osm ${
            types.map(i => `${i}s`).join(', ')
        } ${
            tags ? `for ${tags.replaceAll('"','').replaceAll('[','').split(']').filter(i => i).join(', ')}` : ''
        } via overpass`},
    })

    if (!layer) return

    group.addLayer(layer)
}

// document.addEventListener('DOMContentLoaded', async () => {
//     const response = await htmxFetch('/htmx/map/create/', {
//         method:'POST', 
//         data:{
//             subject:'Renewable Energy Potential in Zambales, Philippines'
//         }
//     })

//     const params = await response.json()

//     const queryGeom = turf.bboxPolygon(params.bbox)

//     const map = window.maps[0]

//     for (const category of Object.values(params.categories)) {
//         for (const tags of category.overpass) {
//             await addOverpassDataToLeafletMap({
//                 map,
//                 queryGeom,
//                 tags,
//             })
//         }
//     }
// })