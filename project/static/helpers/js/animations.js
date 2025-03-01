const fadeoutElement = (element, options={}) => {
    console.log(element)
    setTimeout(() => {
        element.style.animation = `fadeOut ${options.fadeTimeout | 4000}ms ease-in-out`
        // element.classList.add('fadeout')
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, options.fnTimeout | 10000);
}