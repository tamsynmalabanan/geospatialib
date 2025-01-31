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

// const cacheDataToSessionStorage = (key, data) => {
//     try {
//         sessionStorage.setItem(key, data)
//         return data
//     } catch (error) {
//         sessionStorage.clear()
//         try {
//             sessionStorage.setItem(key, data)
//             return data
//         } catch {
//             sessionStorage.removeItem(key)
//         }
//     }
// }

// const cacheResponse = async (response, cacheKey) => {
//     const data = await response.clone().text();
//     cacheDataToSessionStorage(`${cacheKey}_data`, data)
    
//     const headers = {}
//     for (const [key, value] of response.headers.entries()) {
//         headers[key] = value; 
//     }
//     const headersString = JSON.stringify(headers)
//     cacheDataToSessionStorage(`${cacheKey}_headers`, headersString)

//     return new Response(new Blob([data]), {
//         status: 200, 
//         statusText: 'OK', 
//         headers: new Headers(headers) }
//     ); 
// }

// const fetchCachedResponse = (cacheKey) => {
//     const cachedData = sessionStorage.getItem(`${cacheKey}_data`); 
//     const cachedHeaders = sessionStorage.getItem(`${cacheKey}_headers`); 
//     if (cachedData && cachedHeaders) {
//         const headers = new Headers(JSON.parse(cachedHeaders))
//         return new Response(new Blob([cachedData]), {
//             status: 200, 
//             statusText: 'OK', 
//             headers 
//         }) 
//     }
// }

const fetchViaCorsProxy = async (url, cacheKey, options={}) => {
    const params = {
        method: 'GET',
        headers: {'HX-Request': 'true'}
    }

    if (Object.keys(options).length > 0) {
        params.method = 'POST'
        params.body = JSON.stringify(options)
        params.headers['X-CSRFToken'] = getCookie('csrftoken')
    }
    
    return fetch(
        `/htmx/library/cors_proxy/?url=${encodeURIComponent(url)}`, 
        params
    ).then(response => {
        return response
    }).catch(error => {
        throw error
    })
}

const fetchDataWithTimeoutMap = new Map()
const fetchDataWithTimeout = async (url, options={}) => {
    const cacheKey = `${url}_${JSON.stringify(options)}`
        
    if (fetchDataWithTimeoutMap.has(cacheKey)) {
        return await fetchDataWithTimeoutMap.get(cacheKey)
    }

    const timeoutMs = options.timeoutMs || 30000
    delete options.timeoutMs

    const controller = options.controller || new AbortController()
    const abortController = () => controller.abort('Timeout/manually aborted')
    delete options.controller
    
    options.abortBtn?.addEventListener('click', abortController)
    delete options.abortBtn
    
    const params = Object.assign({}, options)
    params.signal = controller.signal
    
    const timeoutId = setTimeout(abortController, timeoutMs);
    const fetchPromise = fetch(url, params)
    .then(async response => {
        clearTimeout(timeoutId)
        return response
    }).catch(async error => {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return await fetchViaCorsProxy(url, cacheKey, options)
        } else {
            throw error
        }
    }).finally(() => {
        fetchDataWithTimeoutMap.delete(cacheKey)
    })

    fetchDataWithTimeoutMap.set(cacheKey, fetchPromise)
    return fetchPromise
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

const findOuterElement = (selector, reference, container) => {
    let element
    let parent = reference.parentElement

    while (!element && parent) {
        element = parent.querySelector(selector)
        parent = parent !== container ? parent.parentElement : null
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

const parseChunkedResponseToJSONMap = new Map()
const parseChunkedResponseToJSON = async (response, options={}) => {
    if (parseChunkedResponseToJSONMap.has(response)) {
        return await parseChunkedResponseToJSONMap.get(response)
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
  
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout'));
        }, options.timeoutMs || 30000);
    });
  
    const parsePromise = (async () => {
        try {
            while (true) {
                const { done, value } = await Promise.race([reader.read(), timeoutPromise]);
                if (done) break;
                result += decoder.decode(value, { stream: true });
            }
        
            return JSON.parse(result);
        } catch (error) {
            if (error.name === 'AbortError') {
                return
            } else {
                throw error
            }
        } finally {
            reader.releaseLock()
            parseChunkedResponseToJSONMap.delete(response)
        }
    })()

    parseChunkedResponseToJSONMap.set(response, parsePromise)
    return parsePromise
};

const getRandomString = (length) => { 
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; 
    var result = ''; 
    var charactersLength = characters.length; 
    
    for (var i = 0; i < length; i++) { 
        result += characters.charAt(Math.floor(Math.random() * charactersLength)); 
    } 
    
    return result; 
}

const isolateCheckbox = (parent, currentCheckbox, options={}) => {
    const checkboxSelector = options.checkboxSelector || 'input.form-check-input'
    parent.querySelectorAll(checkboxSelector).forEach(checkbox => {
        if (checkbox.checked && checkbox !== currentCheckbox) {
            checkbox.click()
        }
    })

    if (!currentCheckbox.checked) {
        currentCheckbox.click()
    }
}

const datasetToAttrs = (data) => {
    const attrs = {}
    for (var key in data) { 
        if (data.hasOwnProperty(key)) {
            attrs['data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase()] = data[key]
        }
    }
    return attrs    
}

const removeImageBackground = async (imgSrc, options={}) => {
    const currentTheme = getPreferredTheme()
    
    const bgColor = options.bgColor || { red: 255, green: 255, blue: 255 };
    const threshold = options.threshold || 10;
    
    const imgSrcViaCorsProxy = `/htmx/library/cors_proxy/?url=${encodeURIComponent(imgSrc)}`
    const imageElement = new Image();
    imageElement.crossOrigin = 'Anonymous';
    imageElement.src = imgSrcViaCorsProxy;
    await new Promise(function(resolve) { imageElement.addEventListener('load', resolve); });
    console.log(imageElement)
    
    var canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    
    var ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < imageData.data.length; i += 4) {
        const red = imageData.data[i];
      const green = imageData.data[i + 1];
      const blue = imageData.data[i + 2];
      if (Math.abs(red - bgColor.red) < threshold &&
      Math.abs(green - bgColor.green) < threshold &&
      Math.abs(blue - bgColor.blue) < threshold) {
          imageData.data[i + 3] = 0;
        }
        if (currentTheme === 'dark' && red < threshold && green < threshold && blue < threshold) {
            imageData.data[i] = 255; // Red
            imageData.data[i + 1] = 255; // Green
            imageData.data[i + 2] = 255; // Blue
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const img = createImgElement(
        canvas.toDataURL('image/png'), 
        options.alt || 'Image not found.', {
            className: `img-${currentTheme} img-no-bg`
        }
    )

    return img
}

const toTitleCase = (str) => {
    return str.split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}