const animateElement = (element, animation, options={}) => {
    const initTime = options.initTime || 3000
    const timeoutMs = options.timeoutMs || 4000
    const effect = options.effect || 'ease-in-out'
    const resetTrigger = options.resetTrigger === false ? null : !options.resetTrigger || options.resetTrigger === true ? 'mouseover' : options.resetTrigger
    const removeElement = options.removeElement
    const hideElement = options.hideElement

    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add(animation)
        element.style.animation = `${animation} ${timeoutMs}ms ${effect}`
        
        setTimeout(() => {
            if (element.classList.contains(animation)) {
                removeElement ? element.remove() : hideElement ? element.classList.add('d-none') : null
                element.classList.remove(animation)
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