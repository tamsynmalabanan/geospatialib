const fadeoutElement = (element, options={}) => {
    setTimeout(() => {
        element.styles.animation = `fadeoutAnimation ${fadeoutTimeout | 3000} forwards`
    }, options.fnTimeout | 10000);
}