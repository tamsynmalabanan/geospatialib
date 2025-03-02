const elementResizeObserver = (element, callback) => {
    let resizeTimeout
    
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === element) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    callback(element)
                }, 100)
            }
        }
    });

    resizeObserver.observe(element);
}

const animateElement = (element, animation, options={}) => {
    const initTime = options.initTime || 3000
    const timeoutMs = options.timeoutMs || 4000
    const effect = options.effect || 'ease-in-out'
    const resetTrigger = options.resetTrigger === false ? null : !options.resetTrigger || options.resetTrigger === true ? 'mouseover' : options.resetTrigger
    const callback = options.callback

    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add(animation)
        element.style.animation = `${animation} ${timeoutMs}ms ${effect}`
        
        setTimeout(() => {
            if (element.classList.contains(animation)) {
                element.classList.remove(animation)
                callback && callback(element)
            }
        }, timeoutMs-100)
    }, initTime)

    if (resetTrigger) {
        element.addEventListener(resetTrigger, () => {
            clearTimeout(handlerTimeout)
            element.classList.remove(animation)
            element.style.animation = ''
        })
        
        element.addEventListener('mouseout', () => {
            handlerTimeout = handler()
        })
    }

    handlerTimeout = handler()
}

const setCookie = (name, value, days) => {
    let prefix = document.cookie = name + "=" + value
    
    if (days) {
        const date = new Date()
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
        const expires = "expires=" + date.toUTCString()
        prefix = prefix + ";" + expires
    }
    
    document.cookie = prefix + ";path=/" 
}

const getCookie = (name) => {
    const nameEQ = name + "=";
    const cookiesArray = document.cookie.split(';');
    
    for (let i = 0; i < cookiesArray.length; i++) {
        let cookie = cookiesArray[i];
        
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    
    return null;
}