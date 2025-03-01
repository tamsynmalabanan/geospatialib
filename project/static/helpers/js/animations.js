const fadeoutElement = (element, options={}) => {
    const fnTimeout = options.fnTimeout || 5000
    const fadeTimeout = options.fadeTimeout || 4000
    const animation = options.animation || 'ease-in-out'

    const handler = () => setTimeout(() => {
        element.style.animation = `fadeOut ${fadeTimeout}ms ${animation}`
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, fnTimeout)
    
    let handlerTimeout
    handlerTimeout = handler()
    element.addEventListener('mouseover', () => {
        console.log(element)
        clearTimeout(handlerTimeout)
        element.style.animation = ''
        handlerTimeout = handler()
    })
}