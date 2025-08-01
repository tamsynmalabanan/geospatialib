const addOverpassDataToLeafletMap = async ({
    map,
    query,
    queryGeom,
    zoom,
    tag,
} = {}) => {
    if (!query && !queryGeom) return

    const geojson = await fetchOverpass({queryGeom, zoom, tag, query})
    if (!geojson || !geojson.features?.length) return    
    
    const name = !tag ? 'osm elements' : removeWhitespace(
        tag.replaceAll('[', ' ').replaceAll(']', ' ').replaceAll(':', '=')
    )

    const group = map._layerGroups.local

    const layer = await getLeafletGeoJSONLayer({
        geojson,
        group,
        pane: createCustomPane(map),
        params: {name},
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
//         for (const tag of category.overpass) {
//             await addOverpassDataToLeafletMap({
//                 map,
//                 queryGeom,
//                 tag,
//             })
//         }
//     }
// })