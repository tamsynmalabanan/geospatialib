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

const removeWhitespace = (str) => str.replace(/\s{2,}/g, ' ').trim()