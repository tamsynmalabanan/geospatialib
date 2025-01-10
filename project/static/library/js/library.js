const searchEndpoint = "/htmx/library/search/"
const getSearchForm = () => document.querySelector(`form[hx-get="${searchEndpoint}"]`)

const resetSearchResults = () => {
    const searchResults = document.querySelector('#searchResults')
    if (searchResults) {
        searchResults.parentElement.scrollTop = 0
    }
}

const clearLibraryLayers = () => {
    const map = mapQuerySelector('#geospatialibMap')
    if (map) {
        map.getLayerGroups().library.clearLayers()
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
                const libraryLayers = map.getLayerGroups().library.getLayers()
                if (libraryLayers.length > 0) {
                    const searchResults = document.querySelector('#searchResults')
                    const toggleSelector = 'button.bi.bi-check-circle'
                    let searchResultToggles = Array.from(searchResults.querySelectorAll(toggleSelector))
                    if (nextPathResults) {
                        const targetToggle = target.querySelector(toggleSelector)
                        const targetToggleIndex = searchResultToggles.indexOf(targetToggle)
                        searchResultToggles = searchResultToggles.slice(targetToggleIndex+1)
                    }

                    if (searchResultToggles.length > 0) {
                        const libraryLayerIds = libraryLayers.map(layer => layer.data.layerId)
                        searchResultToggles.forEach(toggle => {
                            if (libraryLayerIds.contains(toggle.dataset.layerId)) {
                                toggle.classList.remove('text-secondary')
                                toggle.classList.add('text-primary')
                                toggle.setAttribute('title', 'Layer added to map')
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