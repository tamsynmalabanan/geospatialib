const fadeoutElement = (element, options={}) => {
    console.log(element)
    setTimeout(() => {
        element.classList.add('fadeout')
        setTimeout(() => {
            element.remove()
        }, 3000)
    }, options.fnTimeout | 10000);
}