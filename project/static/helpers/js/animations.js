const fadeoutElement = (element, options={}) => {
    setTimeout(() => {
        element.style.animation = `fadeOut ${options.fadeTimeout | 4000}ms ease-in-out`
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, options.fnTimeout | 10000);
}