const fadeoutElement = (element, options={}) => {
    const initTimeout = options.initTimeout || 3000
    const fadeoutTimeoutMs = options.fadeoutTimeoutMs || 4000
    const animation = options.animation || 'ease-in-out'
    const resetTrigger = options.resetTrigger === false ? null : !options.resetTrigger || options.resetTrigger === true ? 'mouseover' : options.resetTrigger
    const removeElement = options.removeElement

    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add('fadeout')
        element.style.animation = `fadeOut ${fadeoutTimeoutMs}ms ${animation}`
        
        setTimeout(() => {
            if (element.classList.contains('fadeout')) {
                removeElement ? element.remove() : element.classList.add('d-none')
            }
        }, fadeoutTimeoutMs-100)
    }, initTimeout)

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