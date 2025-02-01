const populateLayerDropdownMenu = (toggle, options={}) => {
    const dropdown = toggle.nextElementSibling
    if (!dropdown || dropdown.innerHTML !== '') return
    
    const map = options.map || mapQuerySelector(options.mapSelector)
    if (!map) return
    const mapId = map.getContainer().id

    const currentLayer = options.layer
    if (!currentLayer) return
    
    const layerGroup = map.getLayerGroups(options.layerGroup || map.getLayerGroup(currentLayer))
    if (!layerGroup) return
    
    const datasetList = toggle.closest('ul.dataset-list')
    const isLegendLayer = datasetList?.id === `${mapId}_legend`
    const isGeoJSONLayer = currentLayer instanceof L.GeoJSON
    const currentCheckbox = datasetList ? findOuterElement(
        'input.form-check-input', 
        toggle, 
        datasetList
    ) : null
    const type = options.type || (document.querySelector(`[data-layers-toggles="#${datasetList?.id}"]`)?.getAttribute('data-layers-type') ?? 'layer')

    const bounds = options.bounds || getLayerBounds(currentLayer)

    const geojson = options.geojson || currentLayer.cachedGeoJSON || layerToGeoJSON(currentLayer)
    
    const zoomBtn = bounds ? 
    createDropdownMenuListItem({
        label: `Zoom to ${type} extent`,
        buttonClass: 'bi bi-zoom-in',
        buttonClickHandler: () => map.zoomToBounds(bounds)
    }) : null
    
    const zoomToCenterBtn = bounds && isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Zoom to ${type} centroid`,
        buttonClass: 'bi bi-crosshair',
        buttonClickHandler: () => map.setView(bounds.getCenter(), 9)
    }) : null

    const isolateBtn = createDropdownMenuListItem({
        label: `Isolate ${type}`,
        buttonClass: 'bi bi-subtract',
        buttonClickHandler: () => currentCheckbox && datasetList ? isolateCheckbox(datasetList, currentCheckbox) : layerGroup.isolateLayer(currentLayer)
    })

    const showHideBtn = !currentCheckbox ? 
    createDropdownMenuListItem({
        label: `Show/hide ${type}`,
        buttonClass: 'bi bi-eye',
        buttonClickHandler: () => layerGroup.toggleLayerVisibility(currentLayer)
    }) : null

    const moveTopBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Move ${type} to top`,
        buttonClass: 'bi bi-chevron-double-up',
        buttonClickHandler: () => layerGroup.moveLayer(currentLayer, {index:0})
    }) : null

    const moveBottomBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Move ${type} to bottom`,
        buttonClass: 'bi bi-chevron-double-down',
        buttonClickHandler: () => layerGroup.moveLayer(currentLayer, {index:-1})
    }) : null

    const moveUpBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Move ${type} up`,
        buttonClass: 'bi bi-chevron-up',
        buttonClickHandler: () => layerGroup.moveLayer(currentLayer, {indexIncrement:1})
    }) : null

    const moveDownBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Move ${type} down`,
        buttonClass: 'bi bi-chevron-down',
        buttonClickHandler: () => layerGroup.moveLayer(currentLayer, {indexIncrement:-1})
    }) : null

    const removeLayerBtn = !currentCheckbox && datasetList ? 
    createDropdownMenuListItem({
        label: `Remove ${type}`,
        buttonClass: 'bi bi-trash3',
        buttonClickHandler: () => layerGroup.customRemoveLayer(currentLayer)
    }) : null

    const duplicateBtn = !currentCheckbox ? createDropdownMenuListItem({
        label: `Duplicate ${type}`,
        buttonClass: 'bi bi-copy',
        buttonAttrs: datasetToAttrs(currentLayer.data),
        buttonClickHandler: () => toggleLayer(
            {target:duplicateBtn.querySelector('button')}, 
            {map:map}
        )
    }) : null

    const layerPropertiesBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `${toTitleCase(type)} properties`,
        buttonClass: 'bi bi-border-style',
        buttonClickHandler: () => {
            const legend = datasetList?.querySelector(`[data-leaflet-id="${currentLayer._leaflet_id}"]`)
            if (!legend) return

            const modal = document.querySelector('#layerPropertiesModal')
            const form = modal.querySelector('form')
            form.setAttribute('data-leaflet-id', currentLayer._leaflet_id)
            form.setAttribute('data-map-id', mapId)

            form.elements.toggleLegend.checked = !legend.classList.contains('d-none')
            form.elements.toggleAttribution.checked = !legend.lastChild.classList.contains('d-none')

            const featureCountField = form.elements.toggleFeatureCount
            isGeoJSONLayer ? featureCountField.parentElement.classList.remove('d-none') : featureCountField.parentElement.classList.add('d-none')
            featureCountField.checked = currentLayer.showFeatureCount

            const toggleWhiteBgField = form.elements.toggleWhiteBg
            !isGeoJSONLayer ? toggleWhiteBgField.parentElement.classList.remove('d-none') : toggleWhiteBgField.parentElement.classList.add('d-none')
            toggleWhiteBgField.checked = currentLayer.removeWhiteBg && legend.querySelector(`#${legend.id}_collapse`).firstChild?.classList.contains('img-bg-removed')

            // const layerLabelField = document.createElement('input')
            // fieldContainers.legend.appendChild(layerLabelField)
            // layerLabelField.value = currentLayer.data.layerTitle
            // layerLabelField.addEventListener('change', () => {
            //     const value = layerLabelField.value
            //     currentLayer.data.layerTitle = value
            //     legend.firstChild.firstChild.innerText = value
            //     duplicateBtn.querySelector('button').setAttribute('data-layer-title', value)
            // })

            const modalBs = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)
            modalBs.show()
        }
    }) : null

    const downloadGeoJSONBtn = geojson ? createDropdownMenuListItem({
        label: `Download geojson`,
        buttonClass: 'bi bi-download',
        buttonClickHandler: () => downloadGeoJSON(
            typeof geojson === 'string' ? geojson : JSON.stringify(geojson), 
            currentLayer.title || currentLayer.data.layerTitle || 'untitled'
        )
    }) : null

    Array(
        zoomBtn,
        zoomToCenterBtn,
        isolateBtn,
        showHideBtn,
        !currentCheckbox ? createDropdownDivider() : null,
        moveTopBtn,
        moveUpBtn,
        moveDownBtn,
        moveBottomBtn,
        !currentCheckbox ? createDropdownDivider() : null,
        removeLayerBtn,
        duplicateBtn,
        layerPropertiesBtn,
        downloadGeoJSONBtn,
    ).forEach(btn => {if (btn) {dropdown.appendChild(btn)}})
}

const layerPropertiesFormHandler = () => {
    const form = document.querySelector('#layerPropertiesModal form')
    if (!form) return

    const handler = () => {
        const map = mapQuerySelector(`#${form.dataset.mapId}`)
        if (!map) return
        
        const legendLayerGroup = map.getLayerGroups('legend')
        const layer = legendLayerGroup.getLayer(form.dataset.leafletId) || legendLayerGroup.getHiddenLayer(form.dataset.leafletId)
        if (!layer) return

        const mapContainer = map.getContainer()
        const legend = mapContainer.querySelector(`#${mapContainer.id}_legend`)
        if (!legend) return

        const layerLegend = legend.querySelector(`[data-leaflet-id="${layer._leaflet_id}"]`)
        if (!layerLegend) return

        return {
            map:map,
            layer:layer,
            legend:legend,
            layerLegend:layerLegend,
        }
    }

    form.elements.toggleLegend.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return
        event.target.checked ? data.layerLegend.classList.remove('d-none') : data.layerLegend.classList.add('d-none')
    })
    
    form.elements.toggleAttribution.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return

        const attribution = data.layerLegend.lastChild
        attribution && (event.target.checked ? attribution.classList.remove('d-none') : attribution.classList.add('d-none'))    
    })

    form.elements.toggleFeatureCount.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return
    
        data.layer.showFeatureCount = data.layer.showFeatureCount ? false : true 
        data.layerLegend.querySelectorAll('.layer-feature-count')?.forEach(span => {
            data.layer.showFeatureCount ? span.classList.remove('d-none') : span.classList.add('d-none')
        })
    })

    form.elements.toggleWhiteBg.addEventListener('change', async (event) => {
        const data = handler()
        if (!data) return
    
        const container = data.layerLegend.querySelector(`#${data.layerLegend.id}_collapse`)
        data.layer.removeWhiteBg = !data.layer.removeWhiteBg && !container.firstChild?.classList.contains('img-bg-removed')
        if (data.map.getLayerGroups('legend').hasLayer(data.layer)) {
            container.innerHTML = ''
            container.appendChild(data.layer.removeWhiteBg ? (await removeImageBackground(
                data.layer.data.layerLegendUrl, {
                    alt: 'Legend not found.',
                    className: 'layer-legend-img'
                }
            )) : createImgElement(
                data.layer.data.layerLegendUrl, 
                {alt:'Legend not found.', className:'layer-legend-img'},
            ))
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    layerPropertiesFormHandler()
})