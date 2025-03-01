const fadeoutElement = (element, options={}) => {
    const fnTimeout = options.fnTimeout || 5000
    const fadeTimeout = options.fadeTimeout || 4000
    const animation = options.animation || 'ease-in-out'

    const handler = () => setTimeout(() => {
        element.classList.add('fadeout')
        element.style.animation = `fadeOut ${fadeTimeout}ms ${animation}`
        setTimeout(() => {
            element.classList.contains('fadeout') && element.remove()
        }, 3000)
    }, fnTimeout)
    
    let handlerTimeout
    handlerTimeout = handler()
    element.addEventListener('mouseover', () => {
        clearTimeout(handlerTimeout)
        element.style.animation = ''
        element.classList.remove('fadeout')
        handlerTimeout = handler()
    })
}