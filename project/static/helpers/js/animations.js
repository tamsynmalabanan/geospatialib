const fadeoutElement = (element, options={}) => {
    const initTimeout = options.initTimeout || 5000
    const fadeoutTimeoutMs = options.fadeoutTimeoutMs || 4000
    const animation = options.animation || 'ease-in-out'
    const resetTrigger = options.resetTrigger ? options.resetTrigger === true ? 'mouseover' : options.resetTrigger : null

    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add('fadeout')
        element.style.animation = `fadeOut ${fadeoutTimeoutMs}ms ${animation}`
        setTimeout(() => {
            element.classList.contains('fadeout') && element.remove()
        }, fadeoutTimeoutMs-100)
    }, initTimeout)
    
    if (resetTrigger) {
        element.addEventListener(resetTrigger, () => {
            clearTimeout(handlerTimeout)
            element.style.animation = ''
            element.classList.remove('fadeout')
            handlerTimeout = handler()
        })
    }

    handlerTimeout = handler()
}