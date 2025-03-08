const titleToTooltip = (element, altTitle) => {
    const title = altTitle || element.getAttribute('title')
    if (!title) return

    element.removeAttribute('title')
    element.setAttribute('data-bs-toggle', 'tooltip')
    element.setAttribute('data-bs-title', title)
    
    const tooltip = bootstrap.Tooltip.getOrCreateInstance(element)
    tooltip.setContent({'.tooltip-inner':title})

    console.log(tooltip._config.container.lastChild.outerHTML)
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
})