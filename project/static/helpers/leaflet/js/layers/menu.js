const getLeafletLayerContextMenu = async (event, layer, {

} = {}) => {
    if (!layer) return 
    const type = getLeafletLayerType(layer)

    const feature = layer.feature
    const geojsonLayer = type === 'geojson' ? layer : feature ? findLeafletFeatureLayerParent(layer) : null

    const group = layer._group || geojsonLayer?._group
    if (!group) return
    
    const layerGeoJSON = await (async () => {
        if (!Array('feature', 'geojson').includes(type)) return
        
        try {
            return feature ? turf.featureCollection([feature]) : layer.toGeoJSON ? layer.toGeoJSON() : null
        } catch {
            try {
                if (type === 'geojson') {
                    return turf.featureCollection(layer.getLayers()?.map(l => l.feature))
                }
            } catch {
                return (await getFromGISDB(dbKey))?.gisData
            }
        }
    })()
    
    const map = group._map
    const mapContainer = map.getContainer()
    const isLegendGroup = map._legendLayerGroups.includes(group)
    const isLegendFeature = isLegendGroup && feature
    const isHidden = group._ch.hasHiddenLayer(layer)
    const isSearch = group._name === 'search'
    const checkbox = layer._checkbox
    const typeLabel = type === 'feature' && !isSearch ? type : 'layer'
    
    const clientLayer = ((geojsonLayer ?? layer)._dbIndexedKey ?? '').startsWith('client')
    const editableLayer = isLegendGroup && geojsonLayer && clientLayer
    const isMapDrawControlLayer = (geojsonLayer ?? layer) === map._drawControl?.options?.edit?.featureGroup
    
    const addLayer = (l) => group._ch.removeHiddenLayer(l)
    const removeLayer = (l, hidden=false) => hidden ? group._ch.addHiddenLayer(l) : group.removeLayer(l)
    
    return contextMenuHandler(event, {
        zoomin: {
            innerText: `Zoom to ${typeLabel}`,
            btnCallback: async () => await zoomToLeafletLayer(layer, map)
        },
        visibility: feature || checkbox ? null : {
            innerText: isHidden ? 'Show layer' : 'Hide layer',
            btnCallback: () => isHidden ? addLayer(layer) : removeLayer(layer, isLegendGroup)
        },
        style: !isLegendGroup || feature ? null : {
            innerText: `Layer properties`,
            btnCallback: async () => {
                const styleAccordionSelector = `#${mapContainer.id}-panels-accordion-style`
                mapContainer.querySelector(`[data-bs-target="${styleAccordionSelector}"]`).click()

                const styleAccordion = mapContainer.querySelector(styleAccordionSelector)
                const layerSelect = styleAccordion.querySelector(`select[name="layer"]`)
                layerSelect.focus()
                layerSelect.value = layer._leaflet_id
                layerSelect.dispatchEvent(new Event('change', {
                    bubbles: true,
                    cancelable: true,
                })) 
            }
        },
        enableEditor: !editableLayer && !isMapDrawControlLayer ? null : {
            innerText: `Edit layer`,
            btnCallback: () => {
                console.log(event)

                // handleLeafletDrawBtns(map, {
                //     include: !isMapDrawControlLayer,
                //     targetLayer: geojsonLayer
                // })
            }
        },

        divider1: !feature || isSearch ? null : {
            divider: true,
        },
        copyFeature: !feature || isSearch ? null : {
            innerText: 'Copy feature',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature))
        },
        copyProperties: !feature || isSearch ? null : {
            innerText: 'Copy properties',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature.properties))
        },
        copyGeometry: !feature || isSearch ? null : {
            innerText: 'Copy geometry',
            btnCallback: () => navigator.clipboard.writeText(JSON.stringify(feature.geometry))
        },
        
        divider5: isSearch ? null : {
            divider: true,
        },
        legend: {
            innerText: (
                isLegendGroup && !feature ? `Duplicate ${typeLabel}` : 'Add to legend'),
            btnCallback: async () => {
                if (isSearch && geojsonLayer?._addBtn) {
                    geojsonLayer._addBtn.click()
                } else {
                    createLeafletLayer(layer._params, {
                        dbIndexedKey: layer._dbIndexedKey,
                        data: layerGeoJSON,
                        group: isLegendGroup ? group : map._ch.getLayerGroups().client,
                        add: true,
                        properties: isLegendGroup ? cloneLeafletLayerStyles(layer) : null
                    })
                }
            }
        },
        download: isSearch || !layerGeoJSON ? null : {
            innerText: 'Download data',
            btnCallback: () => {
                if (layerGeoJSON) downloadGeoJSON(layerGeoJSON, layer._params.title)
            }
        },
        clearData: !layer._dbIndexedKey ? null : {
            innerText: `Clear stored data`,
            btnCallback: async () => {
                deleteFromGISDB(geojsonLayer._dbIndexedKey)
            }
        },
        remove: !isLegendGroup || isLegendFeature ? null : {
            innerText: `Remove ${typeLabel}`,
            keepMenuOn: true,
            btnCallback: (e) => {
                const parentElement = e.target.parentElement
                parentElement.innerHTML = ''
                
                const btn = document.createElement('button')
                btn.className = 'dropdown-item bg-danger border-0 btn btn-sm fs-12'
                btn.addEventListener('click', () => group._ch.clearLayer(layer))
                parentElement.appendChild(btn)
                
                const label = createSpan(
                    'Confirm to remove layer', 
                    {className:'pe-none text-wrap'}
                )
                btn.appendChild(label)
            }
        },
    })
}
