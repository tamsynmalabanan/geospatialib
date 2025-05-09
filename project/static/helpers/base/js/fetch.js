const htmxFetch = async (url, {
    method = 'GET',
    data
} = {}) => {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'HX-Request': 'true',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        if (response.ok && response.status >= 200 && response.status <= 300) {
            return response
        }

        throw new Error('Response not ok.')
    } catch (error) {
        console.error('Error:', error)
        return null
    }
};


const fetchCORSProxy = async (url, fetchParams={}) => {
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
        console.log(response.json())
        return response
    }).catch(error => {
        throw error
    })
}

const mapForFetchTimeout = new Map()
const fetchTimeout = async (url, {
    fetchParams,
    timeoutMs = 60000,
    controller = new AbortController(),
    abortBtns,
} = {}) => {
    const mapKey = `${url}_${JSON.stringify(fetchParams)}` 
    if (mapForFetchTimeout.has(mapKey)) return await mapForFetchTimeout.get(mapKey)

    const abortController = () => controller.abort('Fetch timed out or manually aborted.')
    abortBtns?.forEach(btn => btn.addEventListener('click', abortController))
    
    const timeoutId = setTimeout(abortController, timeoutMs)
    const fetchPromise = fetch(
        url.replace('http:', 'https:'), 
        {...fetchParams, signal: controller.signal}
    ).then(async response => {
        clearTimeout(timeoutId)
        return response
    }).catch(async error => {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return await fetchCORSProxy(url, fetchParams)
        } else {
            throw error
        }
    }).finally(() => {
        setTimeout(() => mapForFetchTimeout.delete(mapKey), 1000)
    })

    mapForFetchTimeout.set(mapKey, fetchPromise)
    return fetchPromise
}

const mapForParseJSONResponse = new Map()
const parseJSONResponse = async (response, {
    timeoutMs = 60000,
} = {}) => {
    if (mapForParseJSONResponse.has(response)) {
        return await mapForParseJSONResponse.get(response)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let result = ''
  
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Parsing timed out.'))
        }, timeoutMs)
    });
  
    const parsePromise = (async () => {
        try {
            while (true) {
                const { done, value } = await Promise.race([reader.read(), timeoutPromise])
                if (done) break
                result += decoder.decode(value, { stream: true })
            }
            return JSON.parse(result)
        } catch (error) {
            if (error.name === 'AbortError') {
                return
            } else {
                throw error
            }
        } finally {
            reader.releaseLock()
            setTimeout(() => mapForParseJSONResponse.delete(response), 1000)
        }
    })()

    mapForParseJSONResponse.set(response, parsePromise)
    return parsePromise
}