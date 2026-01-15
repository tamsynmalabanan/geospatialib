const pushURLParams = (url, params) => {
    const urlObj = new URL(url)
    for (const key in params) {
        urlObj.searchParams.set(key, params[key])
    }
    return urlObj.toString()
}

const customFetchMap = new Map()
const customFetch = async (url, {
    params = {},
    timeout = 60000,
    abortController = new AbortController(),
    abortEvents = [],
    callback=(response) => response,
} = {}) => {
    const clean_url = url.replaceAll('http:', 'https:')
    const mapKey = await hashJSON({clean_url, params})
    
    if (customFetchMap.has(mapKey)) {
        const response = (await customFetchMap.get(mapKey)).clone()
        return callback(response)
    }
    
    const abortFetch = () => abortController.abort()
    const timeoutId = setTimeout(abortFetch, timeout)
    abortEvents.forEach(([element, types]) => {
        types.forEach(type => {
            element.addEventListener(type, abortFetch)
        })
    })

    const headers = params.headers = params.headers ?? {}
    headers['User-Agent'] = 'Geospatialib/1.0 (admin@geospatialib.com)'

    const fetchPromise = fetch(clean_url, {
        ...params, 
        signal: abortController.signal
    }).then(async response => {
        clearTimeout(timeoutId)
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
        }
        return response
    }).catch(error => {
        clearTimeout(timeoutId)
        throw error
    }).finally(() => {
        abortEvents.forEach(([element, types]) => {
            types.forEach(type => {
                element.removeEventListener(type, abortFetch)
            })
        })
        setTimeout(() => customFetchMap.delete(mapKey), 1000)
    })

    customFetchMap.set(mapKey, fetchPromise)
    const response = (await fetchPromise).clone()
    return callback(response)
}

const parseJSONResponseMap = new Map()
const parseJSONResponse = async (response, {
    id,
    timeout = 60000,
} = {}) => {
    if (id && parseJSONResponseMap.has(id)) {
        return parseJSONResponseMap.get(id)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let result = ''
  
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Parsing timed out.'))
        }, timeout)
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
            if (id) {
                setTimeout(() => parseJSONResponseMap.delete(id), 1000)
            }
        }
    })()

    if (id) {
        parseJSONResponseMap.set(id, parsePromise)
    }
    return parsePromise
}