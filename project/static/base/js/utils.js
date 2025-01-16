const observeInnerHTML = (element, callback) => {
    let originalInnerHTML = element.innerHTML;
  
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const newInnerHTML = element.innerHTML;
                if (newInnerHTML !== originalInnerHTML) {
                    callback(newInnerHTML);
                    originalInnerHTML = newInnerHTML;
                }
            }
        });
    });
  
    observer.observe(element, { childList: true, characterData: true });
  
    return observer;
}

const removeURLParams = () => {
    return window.history.pushState({}, '', window.location.href.split('?')[0]);
}

const changeURLParamValue = (url, param, value) => {
    const urlParts = new URL(url);
    urlParts.searchParams.set(param, value);
    return urlParts.toString();
}

const pushParamsToURL = (params) => {
    const urlParams = new URLSearchParams(window.location.search);
  
    for (const key in params) {
      urlParams.set(key, params[key]);
    }
  
    const newURL = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newURL);
}

const getURLParams = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return Object.fromEntries(urlParams)
}

const generateShortUUID = () => {
    const uuid = crypto.randomUUID();
    const shortenedUUID = uuid.substring(0, 8);
    return shortenedUUID;
}

const validateUrl = (str) => {
    try {
      return new URL(str)
    } catch (error) {
      return false
    }
}

const toggleAllSubCollapse = (element) => {
    const collapseElements = element.querySelectorAll('.collapse')
    if (Array.from(collapseElements).some(element => element.classList.contains('show'))) {
        collapseElements.forEach(collapse => {
            if (collapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(collapse)
                bsCollapse.hide()
            }
        })
    } else {
        collapseElements.forEach(collapse => {
            if (!collapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(collapse)
                bsCollapse.show()
            }
        })
    }
}

const pushQueryParamsToURLString = (url, params) => {
    const url_obj = new URL(url)
    for (const key in params) {
        url_obj.searchParams.set(key, params[key])
    }
    return url_obj.toString()
}

const searchByObjectPropertyKeyword = (obj, kw) => {
    const properties = Object.keys(obj).filter(property => {
        return property.toLowerCase().includes(kw.toLowerCase()) && !Array(null, undefined, '').includes(obj[property])
    })

    if (properties.length !== 0) {
        const property = properties.reduce((shortest, current) => (current.length < shortest.length ? current : shortest))
        return obj[property]
    }
}

const removeQueryParams = (urlString) => {
    const url = new URL(urlString);
    url.search = '';
    return url.toString();
}

const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim()

            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue
}

const fetchDataWithTimeout = async (url, options={}) => {
    const cacheKey = `${url}_${JSON.stringify(options)}`
    
    const cachedData = sessionStorage.getItem(`${cacheKey}_data`); 
    const cachedHeaders = sessionStorage.getItem(`${cacheKey}_headers`); 
    if (cachedData && cachedHeaders) { 
        console.log('cacheKey', cacheKey)
        const headers = new Headers(JSON.parse(cachedHeaders))
        return Promise.resolve(new Response(new Blob([cachedData]), {
            status: 200, 
            statusText: 'OK', 
            headers 
        })); 
    }

    let timeoutMs = options.timeoutMs
    if (timeoutMs) {
        delete options.timeoutMs
    } else {
        timeoutMs = 10000
    }

    const controller = new AbortController()
    const abortController = () => controller.abort()
    const timeoutId = setTimeout(abortController, timeoutMs);
    
    if (options.abortBtn) {
        options.abortBtn.addEventListener('click', abortController)
        delete options.abortBtn
    }

    const params = Object.assign({}, options)
    params.signal = controller.signal
    
    let response
    try {
        response = await fetch(url, params)
        clearTimeout(timeoutId)
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            const csrftoken = getCookie('csrftoken')
            response = await fetch(`/htmx/library/cors_proxy/?url=${encodeURIComponent(url)}`, {
                method: 'POST',
                body: JSON.stringify(options),
                headers: {
                    'HX-Request': 'true',
                    'X-CSRFToken': csrftoken,
                }
            })
        } else {
            throw error
        }
    }

    if (response) {
        if (response.ok) {
            const data = await response.clone().text(); 
            const headers = {}
            console.log('response.headers', response.headers, response.headers.get('Content-Type'))
            response.headers.forEach(key, value => {
                headers[key] = value
            })
            sessionStorage.setItem(`${cacheKey}_data`, data); 
            sessionStorage.setItem(`${cacheKey}_headers`, JSON.stringify(headers)); 
        }

        return response
    }
}

const getDomain = (url) => {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const domainParts = hostname.split('.');
    return domainParts.slice(-2).join('.');
}

const parseNumberFromString = (string) => {
    const regex = /\d+(\.\d+)?/;
    const match = string.match(regex);
    return parsedNumber = parseFloat(match[0]);
}

const findOuterElement = (selector, reference) => {
    let element
    let parent = reference.parentElement

    while (!element && parent) {
        element = parent.querySelector(selector)
        parent = parent.parentElement
    }

    return element
}

const parseXML = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const rootElement = xmlDoc.documentElement;
    
    let namespace
    const namespaces = rootElement.attributes;
    for (let i = 0; i < namespaces.length; i++) {
        const name = namespaces.item(i).name
        if (name.startsWith('xmlns')) {
            namespace = namespaces.item(i).value
        }
    }

    return [namespace, rootElement]
}

const formatNumberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const parseChunkedResponseToJSON = async (response, timeout=5000) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
  
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout'));
        }, timeout);
    });
  
    try {
        while (true) {
            const { done, value } = await Promise.race([reader.read(), timeoutPromise]);
            if (done) break;
            result += decoder.decode(value, { stream: true });
        }
    
        const json = JSON.parse(result);
        return json;
    } catch (error) {
        if (error.name === 'AbortError') {
            return
        } else {
            throw error
        }
    } finally {
        reader.releaseLock()
    }
};