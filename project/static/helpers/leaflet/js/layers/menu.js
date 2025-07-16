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
    const isHidden = group._handlers.hasHiddenLayer(layer)
    const isSearch = group._name === 'search'
    const checkbox = layer._checkbox
    const typeLabel = type === 'feature' && !isSearch ? type : 'layer'
    
    const dbIndexedKey = (geojsonLayer ?? layer)._dbIndexedKey
    const clientLayer = (dbIndexedKey ?? '').startsWith('client')
    const editableLayer = isLegendGroup && geojsonLayer && clientLayer
    const isMapDrawControlLayer = editableLayer && (dbIndexedKey === map._drawControl?.options?.edit?.featureGroup?._dbIndexedKey)

    const isMeasured = (map._measuredFeatures ?? []).includes(feature?.properties.__gsl_id__) && layer._measuredFeature

    const addLayer = (l) => group._handlers.removeHiddenLayer(l)
    const removeLayer = (l, hidden=false) => hidden ? group._handlers.addToHiddenLayers(l) : group.removeLayer(l)
    
    return contextMenuHandler(event, {
        zoomin: {
            innerText: `Zoom to ${typeLabel}`,
            btnCallback: async () => await zoomToLeafletLayer(layer, map)
        },
        visibility: feature || checkbox ? null : {
            innerText: isHidden ? 'Show layer' : 'Hide layer',
            btnCallback: () => isHidden ? addLayer(layer) : removeLayer(layer, isLegendGroup)
        },
        measure: !feature || feature.geometry.type.startsWith('Multi') ? null : {
            innerText: `${isMeasured ? 'Hide' : 'Show'} measurements`,
            btnCallback: async () => {
                if (isMeasured) {
                    map._measuredFeatures = (map._measuredFeatures ?? []).filter(i => i !== feature.properties.__gsl_id__)
                    delete layer._measuredFeature
                    layer.hideMeasurements()
                } else {
                    map._measuredFeatures = [...(map._measuredFeatures ?? []), feature.properties.__gsl_id__]
                    layer._measuredFeature = true
                    layer.showMeasurements() 
                }
            }
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
        toggleEditor: !editableLayer ? null : {
            innerText: `${isMapDrawControlLayer ? 'Disable' : 'Enable'} layer editor`,
            btnCallback: async () => await toggleLeafletLayerEditor(geojsonLayer)
        },

        divider5: !feature || !isMapDrawControlLayer ? null : {
            divider: true,
        },
        pasteFeature: !feature || !isMapDrawControlLayer ? null : {
            innerText: 'Paste feature',
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    let newFeature = JSON.parse(text)
                    if (newFeature.type !== 'Feature') return

                    newFeature = (await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]

                    const gslId = newFeature.properties.__gsl_id__ = feature.properties.__gsl_id__

                    const {gisData, queryExtent} = await getFromGISDB(dbIndexedKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: dbIndexedKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })

                    map._drawControl._toggleEditBtn(gisData)
                } catch (error) {
                    console.log(error)
                }
            }
        },
        pasteProperties: !feature || !isMapDrawControlLayer ? null : {
            innerText: 'Paste properties',
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    let newProperties = JSON.parse(text)
                    if (newProperties.type === 'Feature') {
                        newProperties = newProperties.properties
                    }
                    if (!newProperties) return

                    let newFeature = structuredClone(feature)
                    newFeature.properties = newProperties
                    newFeature = (await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]

                    const gslId = newFeature.properties.__gsl_id__ = feature.properties.__gsl_id__

                    const {gisData, queryExtent} = await getFromGISDB(dbIndexedKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: dbIndexedKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })

                    map._drawControl._toggleEditBtn(gisData)
                } catch (error) {
                    console.log(error)
                }
            }
        },
        pasteGeometry: !feature || !isMapDrawControlLayer ? null : {
            innerText: 'Paste geometry',
            btnCallback: async () => {
                const text = await navigator.clipboard.readText()
                if (!text) return
    
                try {
                    let newGeom = JSON.parse(text)
                    if (newGeom.type === 'Feature') newGeom = newGeom.geometry
                    if (!newGeom || !newGeom.coordinates || !newGeom.type) return


                    let newFeature = structuredClone(feature)
                    newFeature.geometry = newGeom
                    newFeature = (await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]

                    const gslId = newFeature.properties.__gsl_id__ = feature.properties.__gsl_id__

                    const {gisData, queryExtent} = await getFromGISDB(dbIndexedKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: dbIndexedKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._dbIndexedKey !== dbIndexedKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateCache: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })

                    map._drawControl._toggleEditBtn(gisData)
                } catch (error) {
                    console.log(error)
                }
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
        
        divider6: isSearch ? null : {
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
                        group: isLegendGroup ? group : map._handlers.getLayerGroups().client,
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
                btn.addEventListener('click', () => group._handlers.clearLayer(layer))
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
