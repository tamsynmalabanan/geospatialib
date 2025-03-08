const fetchCORSProxy = async (url, fetchParams) => {
    const params = {
        method: 'GET',
        headers: {'HX-Request': 'true'}
    }

    if (Object.keys(fetchParams).length > 0) {
        params.method = 'POST'
        params.body = JSON.stringify(fetchParams)
        params.headers['X-CSRFToken'] = getCookie('csrftoken')
    }
    
    return fetch(
        `/htmx/cors_proxy/?url=${encodeURIComponent(url)}`, 
        params
    ).then(response => {
        return response
    }).catch(error => {
        throw error
    })
}

const fetchTimeoutMap = new Map()
const fetchTimeout = async (url, {
    fetchParams,
    timeoutMs = 30000,
    controller = new AbortController(),
    abortBtn,
} = {}) => {
    const mapKey = `${url}_${JSON.stringify(fetchParams)}` 
    if (fetchTimeoutMap.has(mapKey)) return await fetchTimeoutMap.get(mapKey)

    const abortController = () => controller.abort('Fetch timed out or manually aborted.')
    abortBtn?.addEventListener('click', abortController)
    
    const timeoutId = setTimeout(abortController, timeoutMs)
    const fetchPromise = fetch(url.replace('http:', 'https:'), {...fetchParams, ...{signal: controller.signal}})
    .then(async response => {
        clearTimeout(timeoutId)
        return response
    }).catch(async error => {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return await fetchCORSProxy(url, fetchParams)
        } else {
            throw error
        }
    }).finally(() => {
        setTimeout(() => fetchTimeoutMap.delete(mapKey), 1000)
    })

    fetchTimeoutMap.set(mapKey, fetchPromise)
    return fetchPromise
}