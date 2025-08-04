const addOverpassDataToLeafletMap = async ({
    map,
    query,
    queryGeom,
    zoom,
    tags='',
    types=ALL_OVERPASS_ELEMENT_TYPES,
    name=removeWhitespace(`osm ${
        types ? types.map(i => `${i}s`).join(', ') : 'elements'
    } ${
        tags ? `for ${tags.replaceAll('"','').replaceAll('[','').split(']').filter(i => i).join(', ')}` : ''
    } via overpass`)
} = {}) => {
    if (!query && !queryGeom) return

    const geojson = await fetchOverpass(types, tags, {queryGeom, zoom, query})
    if (!geojson || !geojson.features?.length) return    
    
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
//             subject:'Renewable Energy Potential in San Marcelino, Zambales'
//         }
//     })

//     const params = await response.json()

//     const queryGeom = turf.bboxPolygon(params.bbox)

//     const map = window.maps[0]

//     const usedTags = []

//     for (const category of Object.values(params.categories)) {
//         for (const tags of category.overpass) {
//             if (usedTags.includes(tags)) continue

//             usedTags.push(tags)
//             await addOverpassDataToLeafletMap({
//                 map,
//                 queryGeom,
//                 tags,
//                 name: category.title + ' - ' + tags.slice(1, -1),
//             })
//         }
//     }
// })