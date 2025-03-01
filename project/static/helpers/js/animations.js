const fadeoutElement = (element, options={}) => {
    setTimeout(() => {
        element.style.animation = `fadeoutAnimation ${options.fadeoutTimeout | 3000} forwards`
        element.remove()
    }, options.fnTimeout | 10000);
}