const fadeoutElement = (element, options={}) => {
    const fadeTimeout = options.fadeTimeout || 4000
    const fnTimeout = options.fnTimeout || 5000
    
    const handler = () => setTimeout(() => {
        element.style.animation = `fadeOut ${fadeTimeout}ms ease-in-out`
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, fnTimeout)
    
    let handlerTimeout
    handlerTimeout = handler()
    element.addEventListener('mouseover', () => {
        clearTimeout(handlerTimeout)
        handlerTimeout = handler()
    })
}