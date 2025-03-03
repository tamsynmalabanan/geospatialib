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

const animateElement = (element, animation, opt={}) => {
    const initTime = opt.initTime || 3000
    const timeoutMs = opt.timeoutMs || 4000
    const effect = opt.effect || 'ease-in-out'
    const resetTrigger = opt.resetTrigger === false ? null : !opt.resetTrigger || opt.resetTrigger === true ? 'mouseover' : opt.resetTrigger
    const callback = opt.callback

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

const addClassListToSelection = (parent, selector, classList) => {
    parent.querySelectorAll(selector).forEach(el => el.classList.add(...classList))
}

const isViewHeight = (element) => element.offsetHeight === window.innerHeight

const removeWhitespace = (str) => str.replace(/\s{2,}/g, ' ')