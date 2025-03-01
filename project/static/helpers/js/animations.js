const fadeoutElement = (element, options={}) => {
    setTimeout(() => {
        element.styles.animation = `fadeoutAnimation ${options.fadeoutTimeout | 3000} forwards`
    }, options.fnTimeout | 10000);
}