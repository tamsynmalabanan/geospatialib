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
    const target = event.target

    if (event.detail.pathInfo.requestPath.startsWith(searchEndpoint)) {
        const firstPageResults = target.id === 'searchResults'
        const nextPageResults = target.hasAttribute('hx-get') && target.getAttribute('hx-get').startsWith(searchEndpoint)

        if (firstPageResults) {
            mapQuerySelector('#geospatialibMap').fire('updateBboxFields')
            resetSearchResults()
        }

        if (firstPageResults || nextPageResults) {
            const searchResults = document.querySelector('#searchResults')
            const checkboxSelector = 'input.form-check-input'
            
            let searchResultCheckboxes = searchResults.querySelectorAll(checkboxSelector)
            if (nextPageResults) {
                const targetCheckbox = target.querySelector(checkboxSelector)
                const targetCheckboxIndex = Array.prototype.indexOf.call(searchResultCheckboxes, targetCheckbox)
                searchResultCheckboxes = Array.prototype.slice.call(searchResultCheckboxes, targetCheckboxIndex+1)
            }

            console.log(searchResultCheckboxes)
            
            // get map library layers and check if any of the search result items are already in the legend
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