const populateLayerDropdownMenu = (toggle, options={}) => {
    const dropdown = toggle.nextElementSibling
    if (!dropdown || dropdown.innerHTML !== '') return
    
    const map = options.map || mapQuerySelector(options.mapSelector)
    if (!map) return
    
    const currentLayer = options.layer
    if (!currentLayer) return
    
    const layerGroup = map.getLayerGroups(options.layerGroup || map.getLayerGroup(currentLayer))
    if (!layerGroup) return
    
    const datasetList = toggle.closest('ul.dataset-list')
    const isLegendLayer = datasetList?.id === `${map.getContainer().id}_legend`
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
        label: `Zoom to ${type} center`,
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

    const styleLayerBtn = isLegendLayer ? 
    createDropdownMenuListItem({
        label: `Style ${type}`,
        buttonClass: 'bi bi-border-style',
        buttonAttrs: {
            'data-bs-toggle': 'modal',
            'data-bs-target': '#styleLayerModal',
        },
        buttonClickHandler: () => {
            
        }
    }) : null

    const hideLegendBtn = isLegendLayer ? createDropdownMenuListItem({
        label: `Hide ${type} legend`,
        buttonClass: 'bi bi-info-circle',
        buttonClickHandler: () => datasetList?.querySelector(`[data-leaflet-id="${currentLayer._leaflet_id}"]`)?.classList.add('d-none')
    }) : null

    const toggleAttributionBtn = isLegendLayer ? createDropdownMenuListItem({
        label: `Toggle ${type} attribution`,
        buttonClass: 'bi bi-c-circle',
        buttonClickHandler: () => {
            const attribution = datasetList?.querySelector(`[data-leaflet-id="${currentLayer._leaflet_id}"]`)?.lastChild
            attribution && (attribution.classList.contains('d-none') ? attribution.classList.remove('d-none') : attribution.classList.add('d-none'))
        }
    }) : null

    const toggleFeatureCountBtn = isLegendLayer && currentLayer instanceof L.GeoJSON ? createDropdownMenuListItem({
        label: `Toggle feature count`,
        buttonClass: 'bi bi-123',
        buttonClickHandler: () => {
            currentLayer.showFeatureCount = currentLayer.showFeatureCount ? false : true 
            datasetList?.querySelector(`[data-leaflet-id="${currentLayer._leaflet_id}"]`)?.querySelectorAll('.layer-feature-count')?.forEach(span => {
                currentLayer.showFeatureCount ? span.classList.remove('d-none') : span.classList.add('d-none')
            })
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
        styleLayerBtn,
        toggleFeatureCountBtn,
        hideLegendBtn,
        toggleAttributionBtn,
        downloadGeoJSONBtn,
    ).forEach(btn => {if (btn) {dropdown.appendChild(btn)}})
}