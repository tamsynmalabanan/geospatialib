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
        buttonClickHandler: () => {
            const button = duplicateBtn.querySelector('button')
            assignAttrsToElement(button, datasetToAttrs(currentLayer.data))
            toggleLayer(
                {target:button}, 
                {map:map}
            )
        } 
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
            form.elements.layerLabel.value = legend.querySelector('.legend-layer-label').innerText
            
            form.elements.toggleAttribution.checked = currentLayer.data.showAttribution !== 'false' //!legend.lastChild.classList.contains('d-none')
            const attribution = legend.lastChild.querySelector('a')
            form.elements.attributionName.value = attribution.innerText
            form.elements.attributionLink.value = attribution.getAttribute('href')


            const featureCountField = form.elements.toggleFeatureCount
            isGeoJSONLayer ? featureCountField.parentElement.classList.remove('d-none') : featureCountField.parentElement.classList.add('d-none')
            featureCountField.checked = currentLayer.data.showFeatureCount === 'true'

            const toggleWhiteBgField = form.elements.toggleWhiteBg
            !isGeoJSONLayer ? toggleWhiteBgField.parentElement.classList.remove('d-none') : toggleWhiteBgField.parentElement.classList.add('d-none')
            toggleWhiteBgField.checked = currentLayer.data.removeWhiteBg === 'true'

            const modalBs = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)
            modalBs.show()
        }
    }) : null

    const downloadGeoJSONBtn = geojson ? createDropdownMenuListItem({
        label: `Download geojson`,
        buttonClass: 'bi bi-download',
        buttonClickHandler: () => downloadGeoJSON(
            typeof geojson === 'string' ? geojson : JSON.stringify(geojson), 
            currentLayer.title || currentLayer.data.legendLabel || currentLayer.data.layerTitle || 'untitled'
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
        downloadGeoJSONBtn,
        layerPropertiesBtn,
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

    form.elements.layerLabel.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return
        
        const value = event.target.value
        data.layerLegend.querySelector('.legend-layer-label').innerText = value
        data.layer.data.legendLabel = value
    })
    
    Array('attributionName', 'attributionLink').forEach(field => {
        form.elements[field].addEventListener('change', (event) => {
            const data = handler()
            if (!data) return
            
            const value = `Data © <a href='${form.elements.attributionLink.value}' target='_blank'>${form.elements.attributionName.value}</a>`
            data.layerLegend.lastChild.innerHTML = value
            data.layer.data.legendAttribution = value
        })
    })

    form.elements.toggleLegend.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return
        event.target.checked ? data.layerLegend.classList.remove('d-none') : data.layerLegend.classList.add('d-none')
    })
    
    form.elements.toggleAttribution.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return

        const checked = event.target.checked
        data.layer.data.showAttribution = checked ? 'true' : 'false'
        const attribution = data.layerLegend.lastChild
        attribution && (checked ? attribution.classList.remove('d-none') : attribution.classList.add('d-none'))    
    })

    form.elements.toggleFeatureCount.addEventListener('change', (event) => {
        const data = handler()
        if (!data) return
    
        const checked = event.target.checked
        data.layer.data.showFeatureCount = checked ? 'true' : 'false' 
        data.layerLegend.querySelectorAll('.layer-feature-count')?.forEach(span => {
            checked ? span.classList.remove('d-none') : span.classList.add('d-none')
        })
    })

    form.elements.toggleWhiteBg.addEventListener('change', async (event) => {
        const data = handler()
        if (!data) return
    
        const checked = event.target.checked
        data.layer.data.removeWhiteBg = checked ? 'true' : 'false'
        if (data.map.getLayerGroups('legend').hasLayer(data.layer)) {
            const container = data.layerLegend.querySelector(`#${data.layerLegend.id}_collapse`)
            container.innerHTML = ''
            container.appendChild(checked ? (await removeImageBackground(
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