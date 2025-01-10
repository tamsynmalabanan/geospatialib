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
            const nextPathResults = (
                target.tagName.toLowerCase() === 'li' && 
                target.hasAttribute('hx-get') && 
                target.getAttribute('hx-get').startsWith(searchEndpoint)
            )

            if (firstPageResults) {
                map.fire('updateBboxFields')
                resetSearchResults()
            }

            const searchResults = document.querySelector('#searchResults')
            const btnSelector = 'button.bi.bi-check-circle'
            let searchResultBtns = Array.from(searchResults.querySelectorAll(btnSelector))
            if (nextPathResults) {
                const targetBtn = target.querySelector(btnSelector)
                const targetBtnIndex = searchResultBtns.indexOf(targetBtn)
                searchResultBtns = searchResultBtns.slice(targetBtnIndex+1)
            }
            console.log(searchResultBtns)
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