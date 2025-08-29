const getLeafletLayerContextMenu = async (event, layer, {

} = {}) => {
    if (!layer) return 
    const type = getLeafletLayerType(layer)

    const feature = layer.feature
    let brokenGeom
    try {
        brokenGeom = feature ? Array('flatten', 'unkinkPolygon').some(i => turf[i](feature).features.length > 1) : null
    } catch {}
    const featureType = feature ? turf.getType(feature) : null
    const geojsonLayer = type === 'geojson' ? layer : feature ? findLeafletFeatureLayerParent(layer) : null
    const gslId = feature ? feature?.properties?.__gsl_id__ : null
    const indexedDBKey = (geojsonLayer ?? layer)._indexedDBKey

    const group = layer._group ?? geojsonLayer?._group
    if (!group) return
    
    const layerGeoJSON = await (async () => {
        if (!Array('feature', 'geojson').includes(type)) return

        if (feature) return turf.featureCollection([feature])
        
        const featureCount = layer['getLayers']?.().length
        
        try {
            if (featureCount) {
                return layer.toGeoJSON()
            } else {
                throw new Error('No features')
            }
        } catch (error) {
            if (featureCount) {
                return turf.featureCollection(layer.getLayers().map(l => l.feature))
            }

            return (await getFromGISDB(indexedDBKey))?.gisData
        }
    })()

    const map = group._map
    const mapContainer = map.getContainer()
    const isLegendGroup = map._legendLayerGroups.includes(group)
    const isLegendFeature = isLegendGroup && feature
    const isSearch = group._name === 'search'
    const typeLabel = type === 'feature' && !isSearch ? type : 'layer'
    
    const localLayer = (indexedDBKey ?? '').startsWith('local')
    const editableLayer = isLegendGroup && geojsonLayer && localLayer && (await getFromGISDB(indexedDBKey))?.gisData?.features.length <= 1000
    const isMapDrawControlLayer = editableLayer && (indexedDBKey === map._drawControl?._targetLayer?._indexedDBKey)

    const isMeasured = (geojsonLayer._measuredFeatures ?? []).includes(gslId)

    const isLegendGeoJSONLayer = geojsonLayer && isLegendGroup
    const selectedFeatures = isLegendGeoJSONLayer ? geojsonLayer._selectedFeatures ?? [] : null
    const isSelectedFeature = selectedFeatures?.includes(gslId)
    const featureCountAll = geojsonLayer?.getLayers().length ?? 0
    const featureCountSelected = geojsonLayer?.getLayers().filter(l => selectedFeatures?.includes(l.feature.properties.__gsl_id__)).length ?? 0

    return contextMenuHandler(event, {
        zoomin: {
            innerText: `Zoom to ${typeLabel}`,
            btnCallback: async () => await zoomToLeafletLayer(layer, map)
        },
        zoomSelection: feature || !featureCountSelected ? null : {
            innerText: `Zoom to selection`,
            btnCallback: async () => {
                zoomLeafletMapToBounds(map, L.geoJSON(turf.featureCollection(
                    geojsonLayer.getLayers()
                    .map(l => turf.clone(l.feature))
                    .filter(f => selectedFeatures.includes(f.properties.__gsl_id__))
                )).getBounds())
            }
        },
        measure: !feature || brokenGeom || featureType === 'Point' || isSearch ? null : {
            innerText: `${isMeasured ? 'Hide' : 'Show'} measurements`,
            btnCallback: async () => {
                geojsonLayer._measuredFeatures = geojsonLayer._measuredFeatures ?? []
                
                if (isMeasured) {
                    geojsonLayer._measuredFeatures = geojsonLayer._measuredFeatures.filter(i => i !== gslId)
                    layer.hideMeasurements()
                } else {
                    geojsonLayer._measuredFeatures.push(gslId)
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

        selection: !isLegendGeoJSONLayer || !featureCountAll ? null : {
            divider: true,
        },
        selectFeature: !isLegendGeoJSONLayer || !feature ? null : {
            innerText: `${isSelectedFeature ? 'Deselect' : 'Select'} feature`,
            btnCallback: async () => {
                disableLeafletMapSelector(map)
                
                isSelectedFeature 
                ? geojsonLayer._handlers.deselectFeatureLayer(layer) 
                : geojsonLayer._handlers.selectFeatureLayer(layer)
            }
        },
        selectVisible: !isLegendGeoJSONLayer || feature || !featureCountAll || featureCountAll === featureCountSelected ? null : {
            innerText: `Select visible features (${formatNumberWithCommas(featureCountAll)})`,
            btnCallback: async () => {
                disableLeafletMapSelector(map)

                geojsonLayer.eachLayer(l => {
                    geojsonLayer._handlers.selectFeatureLayer(l)
                })
            }
        },
        deselectVisible: !isLegendGeoJSONLayer || feature || !featureCountSelected ? null : {
            innerText: `Deselect visible features (${formatNumberWithCommas(featureCountSelected)})`,
            btnCallback: async () => {
                disableLeafletMapSelector(map)

                geojsonLayer.eachLayer(l => {
                    geojsonLayer._handlers.deselectFeatureLayer(l)
                })
            }
        },
        deselectAll: !isLegendGeoJSONLayer || feature || !selectedFeatures.length ? null : {
            innerText: `Deselect all features (${formatNumberWithCommas(selectedFeatures.length)})`,
            btnCallback: async () => {
                disableLeafletMapSelector(map)
                
                geojsonLayer.eachLayer(l => {
                    geojsonLayer._handlers.deselectFeatureLayer(l)
                })

                geojsonLayer._selectedFeatures = []
            }
        },

        // (de)select all,
        // separate select/deselect
        // reverse selection
        // tools covrage - selected
        // export geojson/csv - selected
        // indexeddb update, if 

        edit: !editableLayer ? null : {
            divider: true,
        },
        deleteFeature: !feature || !isMapDrawControlLayer ? null : {
            innerText: 'Delete geometry',
            btnCallback: async (e) => {
                map.fire('draw:deleted', {layer}) 
            }
        },
        editGeometry: !feature || !isMapDrawControlLayer || brokenGeom ? null : {
            innerText: 'Edit geometry',
            btnCallback: async (e) => {
                map._drawControl._toggleFeatureEdit({feature})
            }
        },
        repairGeometry: !feature || !isMapDrawControlLayer || !brokenGeom ? null : {
            innerText: 'Explode geometry',
            btnCallback: async (e) => {
                map._drawControl._explodeFeatureGeometry(feature)
            }
        },
        toggleEditor: !editableLayer ? null : {
            innerText: `${isMapDrawControlLayer ? 'Disable' : 'Enable'} layer editor`,
            btnCallback: async () => await toggleLeafletLayerEditor(geojsonLayer)
        },

        paste: !feature || !isMapDrawControlLayer ? null : {
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

                    const {gisData, queryExtent} = await getFromGISDB(indexedDBKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: indexedDBKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._indexedDBKey !== indexedDBKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })
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

                    const {gisData, queryExtent} = await getFromGISDB(indexedDBKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: indexedDBKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._indexedDBKey !== indexedDBKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })
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

                    const {gisData, queryExtent} = await getFromGISDB(indexedDBKey)
                    gisData.features = [
                        ...gisData.features.filter(i => i.properties.__gsl_id__ !== gslId),
                        newFeature
                    ]

                    await saveToGISDB(turf.clone(gisData), {
                        id: indexedDBKey,
                        queryExtent: turf.bboxPolygon(turf.bbox(gisData)).geometry
                    })

                    group.getLayers().forEach(i => {
                        if (i._indexedDBKey !== indexedDBKey) return
                        updateLeafletGeoJSONLayer(i, {geojson: gisData, updateLocalStorage: false})
                    })

                    map._drawControl._addChange({
                        type: 'edited',
                        features: [{
                            old: feature,
                            new: newFeature
                        }]
                    })
                } catch (error) {
                    console.log(error)
                }
            }
        },

        copy: !feature || isSearch ? null : {
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

        export: isSearch || !layerGeoJSON ? null : {
            divider: true,
        },
        download: isSearch || !layerGeoJSON ? null : {
            innerText: 'Download data',
            btnCallback: () => {
                if (layerGeoJSON) {
                    downloadGeoJSON(turf.clone(layerGeoJSON), layer._params.title)
                }
            }
        },
        csv: isSearch || !layerGeoJSON ? null : {
            innerText: `Export centroid${feature ? '' : 's'} to CSV`,
            btnCallback: () => {
                const properties = layerGeoJSON.features.map(f => f.properties)

                const headers = [...Array.from(
                    new Set(properties.flatMap(prop => Object.keys(prop)))
                )]

                const rows = properties.map(prop =>
                    headers.map(header => {
                        const value = prop[header] !== undefined ? prop[header] : ''
                        return `"${String(value).replaceAll(/"/g, '""')}"`
                    }).join(',')
                )

                const csv = [headers.join(','), ...rows].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)

                const a = document.createElement('a')
                a.href = url
                a.download = `${layer._params.title}.csv`
                a.click()

                URL.revokeObjectURL(url)
            }
        },
        
        misc: isSearch ? null : {
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
                        ...(indexedDBKey && !feature ? {indexedDBKey} : {data: layerGeoJSON}),
                        group: (feature || !isLegendGroup) ? map._handlers.getLayerGroups().local : group,
                        add: true,
                        properties: isLegendGroup ? cloneLeafletLayerStyles(layer) : null
                    })
                }
            }
        },
        addStoredData: feature || !indexedDBKey || group._name === 'local' ? null : {
            innerText: `Localize stored data`,
            btnCallback: async () => {
                const data = (await getFromGISDB(indexedDBKey)).gisData
                createLeafletLayer({name: layer._params.name, title: layer._params.title}, {
                    data,
                    group: map._handlers.getLayerGroups().local,
                    add: true,
                })
            }
        },
        clearData: feature || !indexedDBKey ? null : {
            innerText: `Clear stored data`,
            btnCallback: async () => {
                deleteFromGISDB(geojsonLayer._indexedDBKey)
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