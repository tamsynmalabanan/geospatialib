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

const animateElement = (element, animation, {
    initTime = 3000,
    timeoutMs = 4000,
    effect = 'ease-in-out',
    resetTrigger,
    callback,
} = {}) => {
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

    if (resetTrigger !== false) {
        element.addEventListener(!resetTrigger || resetTrigger === true ? 'mouseover' : resetTrigger, () => {
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

const addClassListToSelection = (parent, selector, classList) => {
    parent.querySelectorAll(selector).forEach(el => el.classList.add(...classList))
}

const isViewHeight = (element) => element.offsetHeight === window.innerHeight

const removeWhitespace = (str) => (str.replace(/\s{2,}/g, ' ')).trim()

const generateRandomString = (length=16) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''

    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

const generateRandomColor = () => `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`

const parseNumberFromString = (string) => {
    const regex = /\d+(\.\d+)?/;
    const match = string.match(regex);
    return parsedNumber = parseFloat(match[0]);
}

const manageHSLAColor = (color) => {
    if (!color.startsWith('hsla')) return
    
    const [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
    const obj = {
        h,
        s,
        l,
        a,
    }
    obj.toString = (up) => {
        return `hsla(${up.h || obj.h}, ${up.s || obj.s}%, ${up.l || obj.l}%, ${up.a || obj.a})`
    }
    return obj
}

const pushURLParams = (url, params) => {
    const urlObj = new URL(url)
    for (const key in params) {
        urlObj.searchParams.set(key, params[key])
    }
    return urlObj.toString()
}

const formatNumberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const toggleCollapseElements = (parent) => {
    const collapseElements = Array.from(parent.querySelectorAll('.collapse'))
    const hide = collapseElements.some(el => el.classList.contains('show'))
    collapseElements.forEach(el => {
        if (el.classList.contains('show') === hide) {
            const instance = bootstrap.Collapse.getOrCreateInstance(el)
            hide ? instance.hide() : instance.show()
        }
    })
}