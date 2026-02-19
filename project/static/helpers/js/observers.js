const elementMutationObserver = (element, callback, {
    attributes = true,
    attributeFilter,
    childList = false,
    subtree = false,
    once = false,
    timeout = 100
}={}) => {
    let mutationTimeout

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            clearTimeout(mutationTimeout)
            mutationTimeout = setTimeout(() => {
                if (once) observer.disconnect()
                callback(mutation)
            }, timeout);
        }
    })

    observer.observe(element, {
        attributes,
        attributeFilter,
        childList, 
        subtree,
    })

    return observer
}

const elementResizeObserver = (element, callback, {
    once = false,
} = {}) => {
    let resizeTimeout
    
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === element) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (once) observer.unobserve(element)
                    callback(element)
                }, 100)
            }
        }
    });

    observer.observe(element)

    return observer
}


const elementIntersectionObserver = (element, callback, {
    once = false,
} = {}) => {
    let intersectTimeout
    
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                clearTimeout(intersectTimeout);
                intersectTimeout = setTimeout(() => {
                    if (once) observer.unobserve(element)
                    callback(element)
                }, 100)
            }
        }
    }, {rool: null, threshold: 0.1})

    observer.observe(element)

    return observer
}


