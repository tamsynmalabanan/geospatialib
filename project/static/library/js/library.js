const searchEndpoint = "/htmx/library/search/"
const getSearchForm = () => document.querySelector(`form[hx-get="${searchEndpoint}"]`)

const resetSearchResults = () => {
    const searchResults = document.querySelector('#searchResults')
    if (searchResults) {
        searchResults.parentElement.scrollTop = 0
    }
}

const clearLegendLayers = () => {
    const map = mapQuerySelector('#geospatialibMap')
    if (map) {
        map.getLayerGroups().legend.clearLayers()
    }
}

const searchLibrary = (query=null) => {
    const form = getSearchForm()
    
    if (query !== null) {
        form.elements.query.value = query
    }
    
    const event = new CustomEvent('submit')
    form.dispatchEvent(event)

    const sidebar = getSidebarOffcanvas()
    if (window.innerWidth < 992 || !sidebar.classList.contains('offcanvas-lg')) {
        getSidebarToggle().click()
    }
}

const handleSearchQueryField = (value) => {
    getSearchForm().elements.query.value = value
}

const updateSearchResultToggleStyle = (toggle, added=true) => {
    if (added) {
        toggle.classList.remove('bi-circle', 'text-secondary')
        toggle.classList.add('bi-check-circle', 'text-primary')
        toggle.setAttribute('title', 'Layer added to map')
    } else {
        toggle.classList.remove('bi-check-circle', 'text-primary')
        toggle.classList.add('bi-circle', 'text-secondary')
        toggle.setAttribute('title', 'Add layer to map')
    }
}

window.addEventListener("map:init", (event) => {
    const map = event.detail.map
    if (map.getContainer().id !== 'geospatialibMap') return

    map.on('mapInitComplete', () => {
        map.on('layerremove', (event) => {
            const layer = event.layer
            if (!layer.data) return

            const layerId = layer.data.layerId
            if (!layerId) return

            const searchResults = document.querySelector('#searchResults')
            const toggleBtnSelector = `button.add-layer-button.bi.bi-check-circle.text-primary[data-layer-id="${layerId}"]`
            const toggleBtn = searchResults.querySelector(toggleBtnSelector)
            if (!toggleBtn) return

            const legendLayerGroup = map.getLayerGroups().legend
            if (legendLayerGroup.hasHiddenLayer(layer)) return
            
            const legendLayers = legendLayerGroup.customGetLayers().filter(l => l.data)
            if (legendLayers.some(l => l !== layer && l.data.layerId === layerId)) return
            
            updateSearchResultToggleStyle(toggleBtn, false)
            enableMapInteractivity(map)
        })
    })
})

document.addEventListener('htmx:afterSwap', (event) => {
    if (event.detail.pathInfo.requestPath.startsWith(searchEndpoint)) {
        const map = mapQuerySelector('#geospatialibMap')
        if (map) {
            const target = event.target

            const firstPageResults = target.id === 'searchResults'
            if (firstPageResults) {
                map.fire('updateBboxFields')
                resetSearchResults()
            }

            const nextPathResults = (
                target.tagName.toLowerCase() === 'li' && 
                target.hasAttribute('hx-get') && 
                target.getAttribute('hx-get').startsWith(searchEndpoint)
            )
            if (firstPageResults || nextPathResults) {
                const mapLegend =  map.getLayerGroups().legend
                const legendLayers = mapLegend.getLayers().concat(mapLegend.hiddenLayers)
                if (legendLayers.length > 0 ) {
                    const searchResults = document.querySelector('#searchResults')
                    const toggleSelector = 'button.add-layer-button'
                    let searchResultToggles = Array.from(searchResults.querySelectorAll(toggleSelector))
                    if (nextPathResults) {
                        const targetToggle = target.querySelector(toggleSelector)
                        const targetToggleIndex = searchResultToggles.indexOf(targetToggle)
                        searchResultToggles = searchResultToggles.slice(targetToggleIndex+1)
                    }

                    if (searchResultToggles.length > 0) {
                        const legendLayerIds = legendLayers.map(layer => layer.data.layerId)
                        searchResultToggles.forEach(toggle => {
                            if (legendLayerIds.includes(toggle.dataset.layerId)) {
                                updateSearchResultToggleStyle(toggle)
                            }
                        })
                    }
                }
            }

        }
    }
})

document.addEventListener('htmx:configRequest', (event) => {
    const detail = event.detail
    if (detail.path === searchEndpoint) {
        const requestParams = detail.parameters

        if (Object.keys(requestParams).length > 1){
            const urlParams = getURLParams()
            for (const key in urlParams) {
                if (!Object.keys(requestParams).includes(key)) {
                    requestParams[key] = urlParams[key]
                }
            }
        } else {
            removeURLParams()
        }

        pushParamsToURL(requestParams)
    }
})