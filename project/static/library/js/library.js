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

        if (firstPageResults) {
            const map = mapQuerySelector('#geospatialibMap')
            map.fire('updateBboxFields')
            resetSearchResults()
        }

        const targetHxGet = target.getAttribute('hx-get')
        const nextPageResults = targetHxGet && targetHxGet.startsWith(searchEndpoint)
        if (firstPageResults || nextPageResults) {
            const searchResults = document.querySelector('#searchResults')
    
            let searchResultCheckboxes
            if (firstPageResults) {
                searchResultCheckboxes = searchResults.querySelectorAll('input.form-check-input')
            } else {
                const searchResultItems = searchResults.children
                const targetIndex = Array.prototype.indexOf.call(searchResultItems, target)
                const newSearchResultItems = Array.prototype.slice.call(searchResultItems, targetIndex + 1)
                searchResultCheckboxes = newSearchResultItems.map(item => {
                    return item.querySelector('input.form-check-input')
                }).filter(checkbox => checkbox !== null)
            }
            console.log(searchResultCheckboxes)
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