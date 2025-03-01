const fadeoutElement = (element, options={}) => {
    const fadeoutTimeoutMs = options.fadeoutTimeoutMs || 4000
    const resetTrigger = (
        options.resetTrigger === false ? 
        null : !options.resetTrigger || options.resetTrigger === true ? 
        'mouseover' : options.resetTrigger
    )

    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add('fadeout')
        element.style.animation = `fadeOut ${fadeoutTimeoutMs}ms ${options.animation || 'ease-in-out'}`
        
        setTimeout(() => {
            if (element.classList.contains('fadeout')) {
                options.removeElement ? element.remove() : element.classList.add('d-none')
            }
        }, fadeoutTimeoutMs-100)
    }, options.initTimeout || 3000)
    
    if (resetTrigger) {
        element.addEventListener(resetTrigger, () => {
            clearTimeout(handlerTimeout)
            element.classList.remove('fadeout')
            element.style.animation = ''
        })
        
        element.addEventListener('mouseout', () => {
            handlerTimeout = handler()
        })
    }

    handlerTimeout = handler()
}