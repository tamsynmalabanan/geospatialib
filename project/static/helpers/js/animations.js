const fadeoutElement = (element, options={}) => {
    setTimeout(() => {
        element.classList.add('fadeout')
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, options.fnTimeout | 10000);
    element.remove()
}